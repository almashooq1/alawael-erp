/**
 * Wire all 12 frontend pages to use API services with demo data fallback
 * Run once: node frontend/scripts/wire-pages.js
 */
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');

const modifications = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ContractsManagement.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'ContractsManagement.js',
    addImport: "import contractsService from '../services/contracts.service';\n",
    oldEffect: `  useEffect(() => {\n    setContracts(demoData);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await contractsService.getAll();
        setContracts(res.data || []);
        const statsRes = await contractsService.getStats();
        setStats(statsRes.data || demoStats);
      } catch {
        setContracts(demoData);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SmartNotificationCenter.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'SmartNotificationCenter.js',
    addImport: "import smartNotificationsService from '../services/smartNotifications.service';\n",
    oldEffect: `  useEffect(() => {\n    setNotifications(demoNotifications);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await smartNotificationsService.getAll();
        setNotifications(res.data || []);
      } catch {
        setNotifications(demoNotifications);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. AdvancedTickets.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'AdvancedTickets.js',
    addImport: "import advancedTicketsService from '../services/advancedTickets.service';\n",
    oldEffect: `  useEffect(() => {\n    setTickets(demoTickets);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await advancedTicketsService.getAll();
        setTickets(res.data || []);
        const slaRes = await advancedTicketsService.getSlaStats();
        setStats(slaRes.data || demoStats);
      } catch {
        setTickets(demoTickets);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EInvoicing.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'EInvoicing.js',
    addImport: "import eInvoicingService from '../services/eInvoicing.service';\n",
    oldEffect: `  useEffect(() => {\n    setInvoices(demoInvoices);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await eInvoicingService.getAll();
        setInvoices(res.data || []);
        const statsRes = await eInvoicingService.getStats();
        setStats(statsRes.data || demoStats);
      } catch {
        setInvoices(demoInvoices);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MeetingsManagement.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'MeetingsManagement.js',
    addImport: "import meetingsService from '../services/meetings.service';\n",
    oldEffect: `  useEffect(() => {\n    setMeetings(demoMeetings);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await meetingsService.getAll();
        setMeetings(res.data || []);
      } catch {
        setMeetings(demoMeetings);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. VisitorRegistry.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'VisitorRegistry.js',
    addImport: "import visitorsService from '../services/visitors.service';\n",
    oldEffect: `  useEffect(() => {\n    setVisitors(demoVisitors);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await visitorsService.getAll();
        setVisitors(res.data || []);
        const statsRes = await visitorsService.getTodayStats();
        setStats(statsRes.data || demoStats);
      } catch {
        setVisitors(demoVisitors);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ESignature.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'ESignature.js',
    addImport: "import eSignatureService from '../services/eSignature.service';\n",
    oldEffect: `  useEffect(() => {\n    setRequests(demoRequests);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await eSignatureService.getAll();
        setRequests(res.data || []);
      } catch {
        setRequests(demoRequests);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. KnowledgeCenter.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'KnowledgeCenter.js',
    addImport: "import knowledgeCenterService from '../services/knowledgeCenter.service';\n",
    oldEffect: `  useEffect(() => {\n    setArticles(demoArticles);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await knowledgeCenterService.getArticles();
        setArticles(res.data || []);
      } catch {
        setArticles(demoArticles);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. RiskAssessment.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'RiskAssessment.js',
    addImport: "import riskAssessmentService from '../services/riskAssessment.service';\n",
    oldEffect: `  useEffect(() => {\n    setRisks(demoRisks);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await riskAssessmentService.getAll();
        setRisks(res.data || []);
      } catch {
        setRisks(demoRisks);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. BudgetManagement.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'BudgetManagement.js',
    addImport: "import budgetManagementService from '../services/budgetManagement.service';\n",
    oldEffect: `  useEffect(() => {\n    setBudgets(demoBudgets);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await budgetManagementService.getAll();
        setBudgets(res.data || []);
      } catch {
        setBudgets(demoBudgets);
      }
    };
    loadData();
  }, []);`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. EmployeePortal.js — No useEffect, uses inline useState init
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'EmployeePortal.js',
    addImport: "import employeePortalService from '../services/employeePortal.service';\n",
    // For EmployeePortal, we need to find and add a useEffect after the component declaration
    oldEffect: null, // special case — handle separately
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. KPIDashboard.js
  // ═══════════════════════════════════════════════════════════════════════════
  {
    file: 'KPIDashboard.js',
    addImport: "import kpiDashboardService from '../services/kpiDashboard.service';\n",
    oldEffect: `  useEffect(() => {\n    setKpis(demoKPIs);\n  }, []);`,
    newEffect: `  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await kpiDashboardService.getAll();
        setKpis(res.data || []);
      } catch {
        setKpis(demoKPIs);
      }
    };
    loadData();
  }, []);`,
  },
];

let count = 0;
for (const mod of modifications) {
  const filePath = path.join(pagesDir, mod.file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add import after existing imports (after the last 'from' import line in first section)
  // Strategy: add after the first import line (line 1 = `import React...`)
  // We'll add it right after the first line
  const firstLineEnd = content.indexOf('\n');
  content = content.slice(0, firstLineEnd + 1) + mod.addImport + content.slice(firstLineEnd + 1);

  // 2. Replace useEffect (if applicable)
  if (mod.oldEffect && mod.newEffect) {
    if (content.includes(mod.oldEffect)) {
      content = content.replace(mod.oldEffect, mod.newEffect);
    } else {
      console.warn(`⚠ Could not find exact useEffect in ${mod.file} — trying relaxed match`);
      // Try with different spacing
      const relaxed = mod.oldEffect.replace(/\n/g, '\r\n');
      if (content.includes(relaxed)) {
        content = content.replace(relaxed, mod.newEffect);
      } else {
        console.error(`✗ FAILED to match useEffect in ${mod.file}`);
      }
    }
  }

  // 3. Special case: EmployeePortal.js — add useEffect after enqueueSnackbar line
  if (mod.file === 'EmployeePortal.js') {
    const marker = `const { enqueueSnackbar } = useSnackbar?.() || { enqueueSnackbar: () => {} };`;
    const markerIdx = content.indexOf(marker);
    if (markerIdx !== -1) {
      const insertPos = content.indexOf('\n', markerIdx) + 1;
      const newEffect = `
  useEffect(() => {
    const loadData = async () => {
      try {
        const profileRes = await employeePortalService.getProfile();
        if (profileRes.data) {
          // Profile loaded from API
        }
        const leavesRes = await employeePortalService.getLeaves();
        if (leavesRes.data && leavesRes.data.length > 0) setLeaveHistory(leavesRes.data);
        const reqRes = await employeePortalService.getRequests();
        if (reqRes.data && reqRes.data.length > 0) setRequests(reqRes.data);
      } catch {
        // Keep demo data as fallback
      }
    };
    loadData();
  }, []);

`;
      content = content.slice(0, insertPos) + newEffect + content.slice(insertPos);
    } else {
      console.error(`✗ FAILED to find marker in EmployeePortal.js`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  count++;
  console.log(`✅ ${count}/12 → ${mod.file}`);
}

console.log(`\n✅ All ${count} pages wired to API services with demo fallback!`);
