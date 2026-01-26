/**
 * Supply & Support System - Sample Data & Testing Guide
 * بيانات العينة ودليل الاختبار
 */

// ===============================================
// SAMPLE DATA FOR TESTING
// ===============================================

const SAMPLE_REQUESTS = [
  {
    fromBranch: "BR001",
    toBranch: "BR002",
    items: [
      { item_name: "bandages", quantity: 100, unit_price: 10 },
      { item_name: "gloves", quantity: 500, unit_price: 5 },
      { item_name: "syringes", quantity: 200, unit_price: 15 }
    ],
    priority: "normal"
  },
  {
    fromBranch: "BR002",
    toBranch: "BR003",
    items: [
      { item_name: "wheelchairs", quantity: 5, unit_price: 2000 },
      { item_name: "crutches", quantity: 20, unit_price: 300 }
    ],
    priority: "urgent"
  },
  {
    fromBranch: "BR003",
    toBranch: "BR001",
    items: [
      { item_name: "antibiotics", quantity: 1000, unit_price: 50 },
      { item_name: "painkillers", quantity: 2000, unit_price: 10 }
    ],
    priority: "emergency"
  },
  {
    fromBranch: "BR004",
    toBranch: "BR002",
    items: [
      { item_name: "masks", quantity: 5000, unit_price: 2 },
      { item_name: "paper", quantity: 100, unit_price: 50 }
    ],
    priority: "normal"
  }
];

const SAMPLE_TICKETS = [
  {
    fromBranch: "BR001",
    category: "supply",
    description: "نفاد مشروبات المريض - طلب عاجل للإمدادات الإضافية",
    priority: "urgent"
  },
  {
    fromBranch: "BR002",
    category: "equipment",
    description: "كرسي متحرك معطل - يحتاج إلى إصلاح أو استبدال فوري",
    priority: "high"
  },
  {
    fromBranch: "BR003",
    category: "technical",
    description: "مشاكل في نظام التتبع - لا يمكن تحديد موقع الشحنة",
    priority: "high"
  },
  {
    fromBranch: "BR004",
    category: "supply",
    description: "نقص الأوراق المكتبية - التأثير على العمليات الإدارية",
    priority: "normal"
  },
  {
    fromBranch: "BR001",
    category: "other",
    description: "استفسار عن سياسة الإرجاع للمواد غير المستخدمة",
    priority: "low"
  }
];

const SAMPLE_COMMENTS = [
  {
    ticketId: "TKT-1",
    author: "Ahmed Al-Rashid",
    comment: "نحتاج إلى 500 وحدة إضافية من مشروبات المريض في أقرب وقت"
  },
  {
    ticketId: "TKT-1",
    author: "Fatima Al-Zahra",
    comment: "تم تخصيص 600 وحدة من المخزن الرئيسي"
  },
  {
    ticketId: "TKT-2",
    author: "Mohammed Al-Otaibi",
    comment: "تم إرسال كرسي متحرك جديد - سيصل غداً"
  },
  {
    ticketId: "TKT-3",
    author: "Noor Al-Ajmi",
    comment: "تم إصلاح مشكلة نظام التتبع - الآن يعمل بشكل صحيح"
  }
];

// ===============================================
// TESTING WORKFLOW
// ===============================================

const TESTING_WORKFLOW = {
  scenario_1: {
    name: "Scenario 1: Basic Supply Request",
    steps: [
      {
        step: 1,
        description: "Create supply request from BR001 to BR002",
        method: "POST",
        endpoint: "/api/supply/requests",
        payload: SAMPLE_REQUESTS[0],
        expected_status: 201
      },
      {
        step: 2,
        description: "Get request details",
        method: "GET",
        endpoint: "/api/supply/system-status",
        expected_status: 200
      },
      {
        step: 3,
        description: "Approve the request",
        method: "POST",
        endpoint: "/api/supply/requests/REQ-1/approve",
        expected_status: 200
      },
      {
        step: 4,
        description: "Check transfer status",
        method: "GET",
        endpoint: "/api/supply/branches/BR002/transfers",
        expected_status: 200
      }
    ]
  },

  scenario_2: {
    name: "Scenario 2: Support Ticket Lifecycle",
    steps: [
      {
        step: 1,
        description: "Create support ticket",
        method: "POST",
        endpoint: "/api/supply/tickets",
        payload: SAMPLE_TICKETS[0],
        expected_status: 201
      },
      {
        step: 2,
        description: "Add comment to ticket",
        method: "POST",
        endpoint: "/api/supply/tickets/TKT-1/comments",
        payload: SAMPLE_COMMENTS[0],
        expected_status: 200
      },
      {
        step: 3,
        description: "Add another comment",
        method: "POST",
        endpoint: "/api/supply/tickets/TKT-1/comments",
        payload: SAMPLE_COMMENTS[1],
        expected_status: 200
      },
      {
        step: 4,
        description: "Resolve ticket",
        method: "POST",
        endpoint: "/api/supply/tickets/TKT-1/resolve",
        payload: { resolution: "تم توفير 600 وحدة من المخزن الرئيسي" },
        expected_status: 200
      }
    ]
  },

  scenario_3: {
    name: "Scenario 3: Transfer Tracking",
    steps: [
      {
        step: 1,
        description: "Create transfer request",
        method: "POST",
        endpoint: "/api/supply/requests",
        payload: SAMPLE_REQUESTS[1],
        expected_status: 201
      },
      {
        step: 2,
        description: "Approve transfer",
        method: "POST",
        endpoint: "/api/supply/requests/REQ-1/approve",
        expected_status: 200
      },
      {
        step: 3,
        description: "Update transfer to in_transit",
        method: "PUT",
        endpoint: "/api/supply/transfers/TRN-1",
        payload: { status: "in_transit", notes: "الشحنة في الطريق الآن" },
        expected_status: 200
      },
      {
        step: 4,
        description: "Update transfer to delivered",
        method: "PUT",
        endpoint: "/api/supply/transfers/TRN-1",
        payload: { status: "delivered", notes: "تم التسليم بنجاح" },
        expected_status: 200
      }
    ]
  },

  scenario_4: {
    name: "Scenario 4: Analytics & Reports",
    steps: [
      {
        step: 1,
        description: "Get system status",
        method: "GET",
        endpoint: "/api/supply/system-status",
        expected_status: 200
      },
      {
        step: 2,
        description: "Get all branches",
        method: "GET",
        endpoint: "/api/supply/branches",
        expected_status: 200
      },
      {
        step: 3,
        description: "Get branch metrics (BR001)",
        method: "GET",
        endpoint: "/api/supply/branches/BR001/metrics",
        expected_status: 200
      },
      {
        step: 4,
        description: "Get branch report",
        method: "GET",
        endpoint: "/api/supply/branches/BR001/report",
        expected_status: 200
      },
      {
        step: 5,
        description: "Get predictive analysis",
        method: "GET",
        endpoint: "/api/supply/branches/BR001/predictions",
        expected_status: 200
      }
    ]
  }
};

// ===============================================
// CURL COMMANDS FOR QUICK TESTING
// ===============================================

const CURL_EXAMPLES = {
  "1. Create Supply Request": `
curl -X POST http://localhost:3001/api/supply/requests \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromBranch": "BR001",
    "toBranch": "BR002",
    "items": [
      {"item_name": "bandages", "quantity": 100, "unit_price": 10},
      {"item_name": "gloves", "quantity": 500, "unit_price": 5}
    ],
    "priority": "normal"
  }'
  `,

  "2. Approve Request": `
curl -X POST http://localhost:3001/api/supply/requests/REQ-1/approve \\
  -H "Content-Type: application/json"
  `,

  "3. Update Transfer Status": `
curl -X PUT http://localhost:3001/api/supply/transfers/TRN-1 \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "in_transit",
    "notes": "الشحنة في الطريق"
  }'
  `,

  "4. Create Support Ticket": `
curl -X POST http://localhost:3001/api/supply/tickets \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromBranch": "BR002",
    "category": "supply",
    "description": "نفاد المجهزات - طلب عاجل",
    "priority": "urgent"
  }'
  `,

  "5. Add Comment to Ticket": `
curl -X POST http://localhost:3001/api/supply/tickets/TKT-1/comments \\
  -H "Content-Type: application/json" \\
  -d '{
    "author": "Ahmed Al-Rashid",
    "comment": "نحتاج 200 وحدة إضافية"
  }'
  `,

  "6. Resolve Ticket": `
curl -X POST http://localhost:3001/api/supply/tickets/TKT-1/resolve \\
  -H "Content-Type: application/json" \\
  -d '{
    "resolution": "تم توفير المواد المطلوبة"
  }'
  `,

  "7. Get All Branches": `
curl http://localhost:3001/api/supply/branches
  `,

  "8. Get Branch Details": `
curl http://localhost:3001/api/supply/branches/BR001
  `,

  "9. Get Branch Metrics": `
curl http://localhost:3001/api/supply/branches/BR001/metrics
  `,

  "10. Get System Status": `
curl http://localhost:3001/api/supply/system-status
  `,

  "11. Get Predictions": `
curl http://localhost:3001/api/supply/branches/BR001/predictions
  `,

  "12. Get Report": `
curl http://localhost:3001/api/supply/branches/BR001/report
  `
};

// ===============================================
// TESTING CHECKLIST
// ===============================================

const TESTING_CHECKLIST = {
  "System Initialization": [
    "✓ All 4 branches initialized",
    "✓ Inventory created for each branch",
    "✓ System statistics accessible",
    "✓ Health check endpoint working"
  ],

  "Supply Request Management": [
    "✓ Create new request",
    "✓ Request gets unique ID (REQ-1, REQ-2, etc.)",
    "✓ Request shows correct status (pending)",
    "✓ Approve request creates transfer",
    "✓ Approved request status changes to approved",
    "✓ Insufficient inventory handled correctly",
    "✓ Priority levels work (normal, urgent, emergency)"
  ],

  "Transfer Management": [
    "✓ Transfer created with tracking code",
    "✓ Transfer has all required fields",
    "✓ Update to in_transit works",
    "✓ Update to delivered works",
    "✓ Inventory updated after delivery",
    "✓ Transfer history recorded",
    "✓ Both branches show transfer"
  ],

  "Support Ticket System": [
    "✓ Create ticket with all fields",
    "✓ Ticket has correct status (open)",
    "✓ Add comment to ticket",
    "✓ Multiple comments can be added",
    "✓ Resolve ticket changes status",
    "✓ Resolution documented",
    "✓ All categories work (technical, supply, equipment, other)",
    "✓ Priority levels respected"
  ],

  "Analytics & Reporting": [
    "✓ Get all branches data",
    "✓ Get single branch details",
    "✓ Branch metrics calculated correctly",
    "✓ Delivery rate shown",
    "✓ Order accuracy displayed",
    "✓ Response time calculated",
    "✓ Satisfaction rating available",
    "✓ Predictive analysis generated",
    "✓ Low stock items identified",
    "✓ Surplus items detected",
    "✓ Branch report contains all sections"
  ],

  "API Response Format": [
    "✓ All responses include success flag",
    "✓ Data field populated correctly",
    "✓ Message field descriptive",
    "✓ Error responses include error details",
    "✓ Status codes correct (200, 201, 400, 404, 500)"
  ]
};

// ===============================================
// EXPORT FOR USE IN OTHER MODULES
// ===============================================

module.exports = {
  SAMPLE_REQUESTS,
  SAMPLE_TICKETS,
  SAMPLE_COMMENTS,
  TESTING_WORKFLOW,
  CURL_EXAMPLES,
  TESTING_CHECKLIST
};

// ===============================================
// EXAMPLE: HOW TO USE THIS FILE IN TESTS
// ===============================================

/*
const { SAMPLE_REQUESTS, TESTING_WORKFLOW } = require('./sample_data');

// Use in test:
async function testSupplyWorkflow() {
  for (const request of SAMPLE_REQUESTS) {
    console.log('Creating request:', request);
    // Make API call with request data
  }
}

// Use workflow:
const scenario = TESTING_WORKFLOW.scenario_1;
for (const step of scenario.steps) {
  console.log(`Step ${step.step}: ${step.description}`);
  // Execute API call
}
*/

// ===============================================
// QUICK START FOR DEVELOPERS
// ===============================================

console.log(`
╔════════════════════════════════════════════════════════════╗
║   Supply & Support System - Sample Data Loaded             ║
║   Version: 4.0.0                                           ║
║   Ready for Testing                                        ║
╚════════════════════════════════════════════════════════════╝

📋 Available Sample Data:
  - SAMPLE_REQUESTS: 4 request examples
  - SAMPLE_TICKETS: 5 ticket examples
  - SAMPLE_COMMENTS: 4 comment examples
  - TESTING_WORKFLOW: 4 complete scenarios
  - CURL_EXAMPLES: 12 curl command examples
  - TESTING_CHECKLIST: 40+ test items

🚀 Next Steps:
  1. Import this module in your test file
  2. Use sample data for API testing
  3. Follow testing workflows
  4. Execute curl commands for quick validation
  5. Run testing checklist

📖 Example:
  const { SAMPLE_REQUESTS } = require('./sample_data');
  const request = SAMPLE_REQUESTS[0]; // Get first sample request
`);
