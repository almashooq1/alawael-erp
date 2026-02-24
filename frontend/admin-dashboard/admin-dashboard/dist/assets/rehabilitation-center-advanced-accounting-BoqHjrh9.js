import{a as d,A as o,c as v,r as p,s as h,b as u,d as g}from"./main-DFR0ngT_.js";class y{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=d,this.API_ENDPOINTS=o.advancedAccounting||{},this.connectionManager=v,this.realtimeSync=p,this.systemEnhancer=h,this.aiAssistant=u,this.advancedCache=g,this.accounts=[],this.transactions=[],this.invoices=[],this.payments=[],this.expenses=[],this.revenues=[],this.budgets=[],this.reports=[],this.analytics=[],this.currentView="accounts",this.filters={type:"all",category:"all",status:"all",dateRange:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-accounting-management">
        <div class="accounting-header">
          <h2>💰 نظام إدارة المالية والمحاسبة المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createTransaction()">
              <i class="fas fa-plus"></i> معاملة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createInvoice()">
              <i class="fas fa-file-invoice"></i> فاتورة جديدة
            </button>
          </div>
        </div>

        <div class="accounting-tabs">
          <button class="tab-btn ${this.currentView==="accounts"?"active":""}" 
                  onclick="this.switchView('accounts')">
            <i class="fas fa-wallet"></i> الحسابات
          </button>
          <button class="tab-btn ${this.currentView==="transactions"?"active":""}" 
                  onclick="this.switchView('transactions')">
            <i class="fas fa-exchange-alt"></i> المعاملات
          </button>
          <button class="tab-btn ${this.currentView==="invoices"?"active":""}" 
                  onclick="this.switchView('invoices')">
            <i class="fas fa-file-invoice-dollar"></i> الفواتير
          </button>
          <button class="tab-btn ${this.currentView==="payments"?"active":""}" 
                  onclick="this.switchView('payments')">
            <i class="fas fa-credit-card"></i> المدفوعات
          </button>
          <button class="tab-btn ${this.currentView==="expenses"?"active":""}" 
                  onclick="this.switchView('expenses')">
            <i class="fas fa-arrow-down"></i> المصروفات
          </button>
          <button class="tab-btn ${this.currentView==="revenues"?"active":""}" 
                  onclick="this.switchView('revenues')">
            <i class="fas fa-arrow-up"></i> الإيرادات
          </button>
          <button class="tab-btn ${this.currentView==="budgets"?"active":""}" 
                  onclick="this.switchView('budgets')">
            <i class="fas fa-chart-pie"></i> الميزانيات
          </button>
          <button class="tab-btn ${this.currentView==="reports"?"active":""}" 
                  onclick="this.switchView('reports')">
            <i class="fas fa-file-chart-line"></i> التقارير
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="accounting-filters">
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="income">دخل</option>
            <option value="expense">مصروف</option>
            <option value="transfer">تحويل</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغى</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="accounting-content" id="accountingContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"accounts":return this.renderAccounts();case"transactions":return this.renderTransactions();case"invoices":return this.renderInvoices();case"payments":return this.renderPayments();case"expenses":return this.renderExpenses();case"revenues":return this.renderRevenues();case"budgets":return this.renderBudgets();case"reports":return this.renderReports();case"analytics":return this.renderAnalytics();default:return this.renderAccounts()}}renderAccounts(){return this.accounts.length===0?`
        <div class="empty-state">
          <i class="fas fa-wallet"></i>
          <p>لا توجد حسابات</p>
        </div>
      `:`
      <div class="accounts-grid">
        ${this.accounts.map(s=>`
          <div class="account-card type-${s.type}">
            <div class="account-header">
              <h3>${s.name||"حساب"}</h3>
              <span class="account-type">${this.getAccountTypeText(s.type)}</span>
            </div>
            <div class="account-body">
              <div class="account-balance">
                <span class="balance-label">الرصيد:</span>
                <span class="balance-value ${s.balance>=0?"positive":"negative"}">
                  ${this.formatCurrency(s.balance||0)}
                </span>
              </div>
              <div class="account-details">
                <div class="detail-item">
                  <span class="detail-label">الرقم:</span>
                  <span class="detail-value">${s.number||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البنك:</span>
                  <span class="detail-value">${s.bank||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المعاملات:</span>
                  <span class="detail-value">${s.transactionsCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTransactions(){const s=this.getFilteredData(this.transactions);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-exchange-alt"></i>
          <p>لا توجد معاملات</p>
          <button class="btn btn-primary" onclick="this.createTransaction()">
            إضافة معاملة جديدة
          </button>
        </div>
      `:`
      <div class="transactions-list">
        ${s.map(t=>`
          <div class="transaction-card type-${t.type} status-${t.status}">
            <div class="transaction-header">
              <div class="transaction-info">
                <h3>${t.description||"معاملة"}</h3>
                <p class="transaction-date">${this.formatDateTime(t.date)}</p>
              </div>
              <div class="transaction-amount ${t.type==="income"?"positive":t.type==="expense"?"negative":"neutral"}">
                ${t.type==="income"?"+":t.type==="expense"?"-":""}
                ${this.formatCurrency(t.amount||0)}
              </div>
            </div>
            <div class="transaction-body">
              <div class="transaction-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${t.fromAccount||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${t.toAccount||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${t.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(t.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderInvoices(){return this.invoices.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-invoice-dollar"></i>
          <p>لا توجد فواتير</p>
          <button class="btn btn-primary" onclick="this.createInvoice()">
            إضافة فاتورة جديدة
          </button>
        </div>
      `:`
      <div class="invoices-list">
        ${this.invoices.map(s=>`
          <div class="invoice-card status-${s.status}">
            <div class="invoice-header">
              <div class="invoice-info">
                <h3>فاتورة #${s.number||"غير محدد"}</h3>
                <p class="invoice-client">${s.clientName||"غير محدد"}</p>
              </div>
              <div class="invoice-amount">
                ${this.formatCurrency(s.total||0)}
              </div>
            </div>
            <div class="invoice-body">
              <div class="invoice-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الاستحقاق:</span>
                  <span class="detail-value">${this.formatDate(s.dueDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(s.status)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدفوع:</span>
                  <span class="detail-value">${this.formatCurrency(s.paid||0)}</span>
                </div>
              </div>
            </div>
            <div class="invoice-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewInvoice(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.downloadInvoice(${s.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPayments(){return this.payments.length===0?`
        <div class="empty-state">
          <i class="fas fa-credit-card"></i>
          <p>لا توجد مدفوعات</p>
        </div>
      `:`
      <div class="payments-list">
        ${this.payments.map(s=>`
          <div class="payment-card status-${s.status} method-${s.method}">
            <div class="payment-header">
              <h3>${s.description||"دفعة"}</h3>
              <span class="payment-amount">${this.formatCurrency(s.amount||0)}</span>
            </div>
            <div class="payment-body">
              <div class="payment-details">
                <div class="detail-item">
                  <span class="detail-label">الطريقة:</span>
                  <span class="detail-value">${this.getPaymentMethodText(s.method)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(s.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderExpenses(){return this.expenses.length===0?`
        <div class="empty-state">
          <i class="fas fa-arrow-down"></i>
          <p>لا توجد مصروفات</p>
        </div>
      `:`
      <div class="expenses-list">
        ${this.expenses.map(s=>`
          <div class="expense-card category-${s.category}">
            <div class="expense-header">
              <h3>${s.description||"مصروف"}</h3>
              <span class="expense-amount negative">-${this.formatCurrency(s.amount||0)}</span>
            </div>
            <div class="expense-body">
              <div class="expense-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${s.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRevenues(){return this.revenues.length===0?`
        <div class="empty-state">
          <i class="fas fa-arrow-up"></i>
          <p>لا توجد إيرادات</p>
        </div>
      `:`
      <div class="revenues-list">
        ${this.revenues.map(s=>`
          <div class="revenue-card category-${s.category}">
            <div class="revenue-header">
              <h3>${s.description||"إيراد"}</h3>
              <span class="revenue-amount positive">+${this.formatCurrency(s.amount||0)}</span>
            </div>
            <div class="revenue-body">
              <div class="revenue-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${s.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderBudgets(){return this.budgets.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-pie"></i>
          <p>لا توجد ميزانيات</p>
        </div>
      `:`
      <div class="budgets-list">
        ${this.budgets.map(s=>`
          <div class="budget-card">
            <div class="budget-header">
              <h3>${s.name||"ميزانية"}</h3>
              <span class="budget-period">${s.period||"غير محدد"}</span>
            </div>
            <div class="budget-body">
              <div class="budget-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${this.getBudgetProgress(s)}%"></div>
                </div>
                <div class="progress-text">
                  <span>المستخدم: ${this.formatCurrency(s.used||0)}</span>
                  <span>المخصص: ${this.formatCurrency(s.allocated||0)}</span>
                </div>
              </div>
              <div class="budget-details">
                <div class="detail-item">
                  <span class="detail-label">المتبقي:</span>
                  <span class="detail-value">${this.formatCurrency((s.allocated||0)-(s.used||0))}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النسبة:</span>
                  <span class="detail-value">${this.getBudgetProgress(s)}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderReports(){return this.reports.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-chart-line"></i>
          <p>لا توجد تقارير</p>
        </div>
      `:`
      <div class="reports-list">
        ${this.reports.map(s=>`
          <div class="report-card">
            <div class="report-header">
              <h3>${s.title||"تقرير"}</h3>
              <span class="report-date">${this.formatDate(s.date)}</span>
            </div>
            <div class="report-body">
              <div class="report-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفترة:</span>
                  <span class="detail-value">${s.period||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="report-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewReport(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.downloadReport(${s.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAnalytics(){return this.analytics.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <p>لا توجد بيانات تحليلية</p>
        </div>
      `:`
      <div class="analytics-dashboard">
        ${this.analytics.map(s=>`
          <div class="analytic-card">
            <div class="analytic-header">
              <h3>${s.metric}</h3>
              <span class="analytic-value">${s.value}</span>
            </div>
            <div class="analytic-body">
              <p>${s.description||""}</p>
              ${s.trend?`
                <div class="analytic-trend ${s.trend>0?"up":"down"}">
                  <i class="fas fa-arrow-${s.trend>0?"up":"down"}"></i>
                  ${Math.abs(s.trend)}%
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(s){let t=[...s];return this.filters.type!=="all"&&(t=t.filter(a=>a.type===this.filters.type)),this.filters.category!=="all"&&(t=t.filter(a=>a.category===this.filters.category)),this.filters.status!=="all"&&(t=t.filter(a=>a.status===this.filters.status)),t}getBudgetProgress(s){return!s.allocated||s.allocated===0?0:Math.min(100,(s.used||0)/s.allocated*100)}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,t,a,e,i,n,c,l,r]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.accounts||"/api/advanced-accounting/accounts"),this.apiClient.get(this.API_ENDPOINTS.transactions||"/api/advanced-accounting/transactions"),this.apiClient.get(this.API_ENDPOINTS.invoices||"/api/advanced-accounting/invoices"),this.apiClient.get(this.API_ENDPOINTS.payments||"/api/advanced-accounting/payments"),this.apiClient.get(this.API_ENDPOINTS.expenses||"/api/advanced-accounting/expenses"),this.apiClient.get(this.API_ENDPOINTS.revenues||"/api/advanced-accounting/revenues"),this.apiClient.get(this.API_ENDPOINTS.budgets||"/api/advanced-accounting/budgets"),this.apiClient.get(this.API_ENDPOINTS.reports||"/api/advanced-accounting/reports"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-accounting/analytics")]);this.accounts=s.data||[],this.transactions=t.data||[],this.invoices=a.data||[],this.payments=e.data||[],this.expenses=i.data||[],this.revenues=n.data||[],this.budgets=c.data||[],this.reports=l.data||[],this.analytics=r.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading accounting data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-accounting","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,t){this.filters[s]=t.target.value,this.updateContent()}handleSearch(s){this.updateContent()}updateContent(){const s=document.getElementById("accountingContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{pending:"قيد الانتظار",completed:"مكتمل",cancelled:"ملغى",paid:"مدفوع",unpaid:"غير مدفوع",overdue:"متأخر"}[s]||s}getAccountTypeText(s){return{bank:"بنكي",cash:"نقدي",credit:"ائتماني",investment:"استثماري"}[s]||s}getPaymentMethodText(s){return{cash:"نقدي",card:"بطاقة",bank:"تحويل بنكي",check:"شيك",online:"إلكتروني"}[s]||s}formatCurrency(s){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(s)}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedAccounts",JSON.stringify(this.accounts)),localStorage.setItem("advancedTransactions",JSON.stringify(this.transactions)),localStorage.setItem("advancedInvoices",JSON.stringify(this.invoices)),localStorage.setItem("advancedPayments",JSON.stringify(this.payments)),localStorage.setItem("advancedExpenses",JSON.stringify(this.expenses)),localStorage.setItem("advancedRevenues",JSON.stringify(this.revenues)),localStorage.setItem("advancedBudgets",JSON.stringify(this.budgets)),localStorage.setItem("advancedReports",JSON.stringify(this.reports)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.accounts=JSON.parse(localStorage.getItem("advancedAccounts")||"[]"),this.transactions=JSON.parse(localStorage.getItem("advancedTransactions")||"[]"),this.invoices=JSON.parse(localStorage.getItem("advancedInvoices")||"[]"),this.payments=JSON.parse(localStorage.getItem("advancedPayments")||"[]"),this.expenses=JSON.parse(localStorage.getItem("advancedExpenses")||"[]"),this.revenues=JSON.parse(localStorage.getItem("advancedRevenues")||"[]"),this.budgets=JSON.parse(localStorage.getItem("advancedBudgets")||"[]"),this.reports=JSON.parse(localStorage.getItem("advancedReports")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createTransaction=this.createTransaction.bind(this),this.createInvoice=this.createInvoice.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewInvoice=this.viewInvoice.bind(this),this.downloadInvoice=this.downloadInvoice.bind(this),this.viewReport=this.viewReport.bind(this),this.downloadReport=this.downloadReport.bind(this)}async createTransaction(){console.log("Create transaction")}async createInvoice(){console.log("Create invoice")}async viewInvoice(s){console.log("View invoice",s)}async downloadInvoice(s){console.log("Download invoice",s)}async viewReport(s){console.log("View report",s)}async downloadReport(s){console.log("Download report",s)}}export{y as default};
//# sourceMappingURL=rehabilitation-center-advanced-accounting-BoqHjrh9.js.map
