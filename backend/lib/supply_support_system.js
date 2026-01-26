/**
 * Supply & Support System Between Branches
 * نظام الإمداد والمساندة بين الفروع
 *
 * Features:
 * - Branch inventory management
 * - Supply request & fulfillment
 * - Inter-branch transfers
 * - Support ticket system
 * - Real-time tracking
 * - Predictive inventory
 */

class SupplySupportSystem {
  constructor() {
    this.branches = new Map();
    this.supplies = new Map();
    this.requests = new Map();
    this.transfers = new Map();
    this.support_tickets = new Map();
    this.requestId = 0;
    this.transferId = 0;
    this.ticketId = 0;
    this.lastUpdate = new Date();
    this.initializeBranches();
  }

  /**
   * Initialize branch infrastructure
   */
  initializeBranches() {
    const branchData = [
      {
        id: 'BR001',
        name: 'Main Branch - الفرع الرئيسي',
        location: 'Riyadh - الرياض',
        manager: 'Ahmed Al-Rashid',
        contact: '+966-11-xxxxxx',
        status: 'active',
        capacity: 1000,
        inventory_space: 800,
      },
      {
        id: 'BR002',
        name: 'North Branch - الفرع الشمالي',
        location: 'Dammam - الدمام',
        manager: 'Fatima Al-Otaibi',
        contact: '+966-13-xxxxxx',
        status: 'active',
        capacity: 500,
        inventory_space: 350,
      },
      {
        id: 'BR003',
        name: 'West Branch - الفرع الغربي',
        location: 'Jeddah - جدة',
        manager: 'Mohammed Al-Zahrani',
        contact: '+966-12-xxxxxx',
        status: 'active',
        capacity: 600,
        inventory_space: 400,
      },
      {
        id: 'BR004',
        name: 'South Branch - الفرع الجنوبي',
        location: 'Abha - أبها',
        manager: 'Noura Al-Shammari',
        contact: '+966-17-xxxxxx',
        status: 'active',
        capacity: 300,
        inventory_space: 200,
      },
    ];

    branchData.forEach(branch => {
      this.branches.set(branch.id, {
        ...branch,
        inventory: this.initializeInventory(),
        pending_requests: [],
        sent_transfers: [],
        received_transfers: [],
        support_tickets: [],
        performance: {
          delivery_rate: 0.95,
          order_accuracy: 0.98,
          response_time: 4.5,
          satisfaction: 4.7,
        },
      });
    });
  }

  /**
   * Initialize inventory for a branch
   */
  initializeInventory() {
    return {
      medical_supplies: {
        bandages: 500,
        syringes: 1000,
        gloves: 5000,
        masks: 3000,
      },
      equipment: {
        wheelchairs: 50,
        crutches: 75,
        walkers: 40,
      },
      medications: {
        antibiotics: 200,
        painkillers: 300,
        vitamins: 400,
      },
      office_supplies: {
        paper: 100,
        pens: 500,
        folders: 300,
      },
    };
  }

  /**
   * Create supply request from one branch to another
   */
  createSupplyRequest(fromBranch, toBranch, items, priority = 'normal') {
    const request = {
      id: `REQ-${++this.requestId}`,
      from_branch: fromBranch,
      to_branch: toBranch,
      items: items, // [{item_name, quantity, unit_price}]
      priority: priority, // normal, urgent, emergency
      status: 'pending',
      total_amount: this.calculateAmount(items),
      created_at: new Date(),
      estimated_delivery: this.calculateDeliveryDate(priority),
      notes: '',
    };

    this.requests.set(request.id, request);

    // Add to branch pending requests
    const fromBranchData = this.branches.get(fromBranch);
    if (fromBranchData) {
      fromBranchData.pending_requests.push(request.id);
    }

    return request;
  }

  /**
   * Approve supply request and create transfer
   */
  approveSupplyRequest(requestId) {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    // Check availability
    const fromBranch = this.branches.get(request.from_branch);
    const availability = this.checkInventoryAvailability(fromBranch, request.items);

    if (!availability.available) {
      return {
        success: false,
        error: 'Insufficient inventory',
        missing_items: availability.missing,
      };
    }

    // Create transfer
    const transfer = this.createTransfer(
      request.from_branch,
      request.to_branch,
      request.items,
      requestId
    );

    // Update request status
    request.status = 'approved';
    request.transfer_id = transfer.id;

    return {
      success: true,
      transfer: transfer,
      message: 'Supply request approved and transfer initiated',
    };
  }

  /**
   * Create inter-branch transfer
   */
  createTransfer(fromBranch, toBranch, items, relatedRequestId = null) {
    const transfer = {
      id: `TRN-${++this.transferId}`,
      from_branch: fromBranch,
      to_branch: toBranch,
      items: items,
      status: 'pending', // pending, in_transit, delivered
      related_request: relatedRequestId,
      created_at: new Date(),
      dispatched_at: null,
      received_at: null,
      tracking_code: this.generateTrackingCode(),
      notes: '',
    };

    this.transfers.set(transfer.id, transfer);

    // Add to branch transfers
    const fromBranchData = this.branches.get(fromBranch);
    const toBranchData = this.branches.get(toBranch);

    if (fromBranchData) {
      fromBranchData.sent_transfers.push(transfer.id);
    }
    if (toBranchData) {
      toBranchData.received_transfers.push(transfer.id);
    }

    return transfer;
  }

  /**
   * Update transfer status
   */
  updateTransferStatus(transferId, status, notes = '') {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      return { success: false, error: 'Transfer not found' };
    }

    const oldStatus = transfer.status;
    transfer.status = status;
    transfer.notes = notes;

    if (status === 'in_transit') {
      transfer.dispatched_at = new Date();
    } else if (status === 'delivered') {
      transfer.received_at = new Date();
      // Update inventory
      this.updateInventoryAfterTransfer(transfer);
    }

    return {
      success: true,
      transfer: transfer,
      message: `Transfer status updated from ${oldStatus} to ${status}`,
    };
  }

  /**
   * Create support ticket between branches
   */
  createSupportTicket(fromBranch, category, description, priority = 'normal') {
    const ticket = {
      id: `TKT-${++this.ticketId}`,
      from_branch: fromBranch,
      category: category, // technical, supply, equipment, other
      description: description,
      priority: priority, // low, normal, high, critical
      status: 'open', // open, in_progress, resolved, closed
      created_at: new Date(),
      resolved_at: null,
      assigned_to: null,
      resolution: null,
      comments: [],
      attachments: [],
    };

    this.support_tickets.set(ticket.id, ticket);

    // Add to branch
    const branch = this.branches.get(fromBranch);
    if (branch) {
      branch.support_tickets.push(ticket.id);
    }

    return ticket;
  }

  /**
   * Add comment to support ticket
   */
  addTicketComment(ticketId, author, comment) {
    const ticket = this.support_tickets.get(ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }

    ticket.comments.push({
      author: author,
      text: comment,
      timestamp: new Date(),
    });

    return {
      success: true,
      ticket: ticket,
    };
  }

  /**
   * Resolve support ticket
   */
  resolveSupportTicket(ticketId, resolution) {
    const ticket = this.support_tickets.get(ticketId);
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }

    ticket.status = 'resolved';
    ticket.resolution = resolution;
    ticket.resolved_at = new Date();

    return {
      success: true,
      ticket: ticket,
      message: 'Support ticket resolved',
    };
  }

  /**
   * Get branch inventory
   */
  getBranchInventory(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return { success: false, error: 'Branch not found' };
    }

    return {
      success: true,
      branch_id: branchId,
      branch_name: branch.name,
      inventory: branch.inventory,
      total_items: this.calculateInventoryTotal(branch.inventory),
      capacity_used: this.calculateCapacityUsage(branch),
    };
  }

  /**
   * Get all branches
   */
  getAllBranches() {
    const branchList = [];
    this.branches.forEach((branch, id) => {
      branchList.push({
        id: id,
        name: branch.name,
        location: branch.location,
        manager: branch.manager,
        status: branch.status,
        inventory_count: this.calculateInventoryTotal(branch.inventory),
        performance: branch.performance,
      });
    });

    return {
      success: true,
      total_branches: branchList.length,
      branches: branchList,
    };
  }

  /**
   * Get branch performance metrics
   */
  getBranchMetrics(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return { success: false, error: 'Branch not found' };
    }

    const totalRequests = branch.pending_requests.length;
    const totalTransfers = branch.sent_transfers.length + branch.received_transfers.length;
    const totalTickets = branch.support_tickets.length;

    return {
      success: true,
      branch_id: branchId,
      branch_name: branch.name,
      metrics: {
        pending_requests: totalRequests,
        total_transfers: totalTransfers,
        open_tickets: totalTickets,
        capacity_available: branch.capacity - branch.inventory_space,
        delivery_rate: `${(branch.performance.delivery_rate * 100).toFixed(1)}%`,
        order_accuracy: `${(branch.performance.order_accuracy * 100).toFixed(1)}%`,
        avg_response_time: `${branch.performance.response_time} hours`,
        satisfaction_rating: branch.performance.satisfaction,
      },
    };
  }

  /**
   * Predictive inventory analysis
   */
  predictiveInventoryAnalysis(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return { success: false, error: 'Branch not found' };
    }

    const predictions = {
      low_stock_items: [],
      high_demand_items: [],
      reorder_needed: [],
      surplus_items: [],
    };

    // Analyze each item
    for (const [category, items] of Object.entries(branch.inventory)) {
      for (const [itemName, quantity] of Object.entries(items)) {
        if (quantity < 100) {
          predictions.low_stock_items.push({
            item: itemName,
            category: category,
            current_quantity: quantity,
            recommended_action: 'Urgent reorder needed',
          });
        }

        if (quantity > 500) {
          predictions.surplus_items.push({
            item: itemName,
            category: category,
            quantity: quantity,
            recommendation: 'Consider redistribution to other branches',
          });
        }
      }
    }

    return {
      success: true,
      branch_id: branchId,
      predictions: predictions,
      generated_at: new Date(),
    };
  }

  /**
   * Get transfer history
   */
  getTransferHistory(branchId, direction = 'both') {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return { success: false, error: 'Branch not found' };
    }

    const history = {
      sent: [],
      received: [],
      all: [],
    };

    // Get sent transfers
    if (['sent', 'both'].includes(direction)) {
      branch.sent_transfers.forEach(transferId => {
        const transfer = this.transfers.get(transferId);
        if (transfer) {
          history.sent.push(transfer);
        }
      });
    }

    // Get received transfers
    if (['received', 'both'].includes(direction)) {
      branch.received_transfers.forEach(transferId => {
        const transfer = this.transfers.get(transferId);
        if (transfer) {
          history.received.push(transfer);
        }
      });
    }

    if (direction === 'both') {
      history.all = [...history.sent, ...history.received];
    }

    return {
      success: true,
      branch_id: branchId,
      history: history,
      total_transfers: history.all.length || history.sent.length || history.received.length,
    };
  }

  /**
   * Generate branch report
   */
  generateBranchReport(branchId) {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return { success: false, error: 'Branch not found' };
    }

    const report = {
      branch_id: branchId,
      branch_name: branch.name,
      report_date: new Date(),
      summary: {
        total_inventory_value: this.calculateInventoryValue(branch.inventory),
        items_in_stock: this.calculateInventoryTotal(branch.inventory),
        capacity_usage: `${this.calculateCapacityUsage(branch)}%`,
        pending_requests: branch.pending_requests.length,
        active_transfers: branch.sent_transfers.length + branch.received_transfers.length,
        open_support_tickets: branch.support_tickets.length,
      },
      performance: branch.performance,
      recent_activity: {
        last_transfer:
          branch.sent_transfers.length > 0 ? this.transfers.get(branch.sent_transfers[0]) : null,
        pending_request_count: branch.pending_requests.length,
        unresolved_tickets: branch.support_tickets.filter(tid => {
          const ticket = this.support_tickets.get(tid);
          return ticket && ticket.status !== 'closed';
        }).length,
      },
    };

    return {
      success: true,
      report: report,
    };
  }

  /**
   * Helper: Check inventory availability
   */
  checkInventoryAvailability(branch, items) {
    const missing = [];
    let available = true;

    items.forEach(item => {
      const currentQuantity = this.getItemQuantity(branch, item.item_name);
      if (currentQuantity < item.quantity) {
        available = false;
        missing.push({
          item: item.item_name,
          requested: item.quantity,
          available: currentQuantity,
        });
      }
    });

    return { available, missing };
  }

  /**
   * Helper: Calculate amount
   */
  calculateAmount(items) {
    return items.reduce((sum, item) => sum + item.quantity * (item.unit_price || 0), 0);
  }

  /**
   * Helper: Calculate delivery date
   */
  calculateDeliveryDate(priority) {
    const days = priority === 'emergency' ? 1 : priority === 'urgent' ? 3 : 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Helper: Calculate inventory total
   */
  calculateInventoryTotal(inventory) {
    let total = 0;
    for (const category of Object.values(inventory)) {
      total += Object.values(category).reduce((sum, qty) => sum + qty, 0);
    }
    return total;
  }

  /**
   * Helper: Calculate capacity usage
   */
  calculateCapacityUsage(branch) {
    const total = this.calculateInventoryTotal(branch.inventory);
    return Math.round((total / branch.capacity) * 100);
  }

  /**
   * Helper: Calculate inventory value
   */
  calculateInventoryValue(inventory) {
    // Simplified calculation
    return this.calculateInventoryTotal(inventory) * 50; // Average unit value
  }

  /**
   * Helper: Get item quantity
   */
  getItemQuantity(branch, itemName) {
    for (const category of Object.values(branch.inventory)) {
      if (category[itemName] !== undefined) {
        return category[itemName];
      }
    }
    return 0;
  }

  /**
   * Helper: Update inventory after transfer
   */
  updateInventoryAfterTransfer(transfer) {
    const fromBranch = this.branches.get(transfer.from_branch);
    const toBranch = this.branches.get(transfer.to_branch);

    if (fromBranch && toBranch) {
      transfer.items.forEach(item => {
        // Find and update item in both branches
        for (const category of Object.values(fromBranch.inventory)) {
          if (category[item.item_name]) {
            category[item.item_name] -= item.quantity;
          }
        }

        for (const category of Object.values(toBranch.inventory)) {
          if (category[item.item_name]) {
            category[item.item_name] += item.quantity;
          }
        }
      });
    }
  }

  /**
   * Helper: Generate tracking code
   */
  generateTrackingCode() {
    return 'TRK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Get system statistics
   */
  getSystemStatistics() {
    let totalRequests = 0;
    let totalTransfers = 0;
    let totalTickets = 0;
    let totalInventory = 0;

    this.branches.forEach(branch => {
      totalRequests += branch.pending_requests.length;
      totalTransfers += branch.sent_transfers.length + branch.received_transfers.length;
      totalTickets += branch.support_tickets.length;
      totalInventory += this.calculateInventoryTotal(branch.inventory);
    });

    return {
      success: true,
      system_status: 'operational',
      total_branches: this.branches.size,
      total_supply_requests: this.requests.size,
      total_transfers: this.transfers.size,
      total_support_tickets: this.support_tickets.size,
      total_inventory_items: totalInventory,
      pending_requests: Array.from(this.requests.values()).filter(r => r.status === 'pending')
        .length,
      in_transit_transfers: Array.from(this.transfers.values()).filter(
        t => t.status === 'in_transit'
      ).length,
      open_tickets: Array.from(this.support_tickets.values()).filter(t => t.status === 'open')
        .length,
      last_update: this.lastUpdate,
    };
  }
}

module.exports = SupplySupportSystem;
