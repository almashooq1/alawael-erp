const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var f=(l,e)=>()=>(e||l((e={exports:{}}).exports,e),e.exports);import{_ as o}from"./main-DFR0ngT_.js";var w=f((B,v)=>{let d=null,i=null,u=null,g=null,b=null,c=null;async function m(){if(d===null)try{d=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.f),__vite__mapDeps([0,1]))).default,i=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{g=(await o(()=>import("./main-DFR0ngT_.js").then(s=>s.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{u=(await o(()=>import("./main-DFR0ngT_.js").then(s=>s.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{b=(await o(()=>import("./main-DFR0ngT_.js").then(s=>s.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{c=(await o(()=>import("./main-DFR0ngT_.js").then(s=>s.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),d=null,i=null}}class p{constructor(){this.budgets=[],this.expenses=[],this.revenues=[],this.categories=[],this.selectedBudget=null,this.currentView="overview",this.filterCategory="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await m(),this.useAPI=d!==null,this.useAPI?(await this.loadBudgets(),await this.loadExpenses(),await this.loadRevenues(),await this.loadCategories()):this.initializeDefaultData(),u&&this.setupRealtimeSync(),g&&this.setupConnectionMonitoring(),this.renderAdvancedBudget()}setupRealtimeSync(){u.subscribe("budget:updated",e=>{this.loadBudgets()}),u.subscribe("budget:expense:updated",e=>{this.loadExpenses()})}setupConnectionMonitoring(){g.onStatusChange(e=>{e&&this.useAPI&&this.syncPendingChanges()})}async loadBudgets(){var e,t,s;this.loading=!0;try{if(this.useAPI&&d){const a="advanced_budget_budgets",n=c?c.get(a):null;if(n)this.budgets=n;else{const r=await d.get(((t=(e=i==null?void 0:i.advancedBudget)==null?void 0:e.budgets)==null?void 0:t.list)||"/api/advanced-budget/budgets");(s=r.data)!=null&&s.success&&(this.budgets=r.data.data||[],c&&c.set(a,this.budgets,{ttl:5*60*1e3,tags:["budget"]}))}}}catch(a){console.error("Error loading budgets:",a),this.loadBudgetsFromStorage()}finally{this.loading=!1,this.renderAdvancedBudget()}}async loadExpenses(){var e,t,s;try{if(this.useAPI&&d){const a=await d.get(((t=(e=i==null?void 0:i.advancedBudget)==null?void 0:e.expenses)==null?void 0:t.list)||"/api/advanced-budget/expenses");(s=a.data)!=null&&s.success&&(this.expenses=a.data.data||[])}}catch(a){console.error("Error loading expenses:",a),this.loadExpensesFromStorage()}}async loadRevenues(){var e,t,s;try{if(this.useAPI&&d){const a=await d.get(((t=(e=i==null?void 0:i.advancedBudget)==null?void 0:e.revenues)==null?void 0:t.list)||"/api/advanced-budget/revenues");(s=a.data)!=null&&s.success&&(this.revenues=a.data.data||[])}}catch(a){console.error("Error loading revenues:",a),this.loadRevenuesFromStorage()}}async loadCategories(){var e,t,s;try{if(this.useAPI&&d){const a=await d.get(((t=(e=i==null?void 0:i.advancedBudget)==null?void 0:e.categories)==null?void 0:t.list)||"/api/advanced-budget/categories");(s=a.data)!=null&&s.success&&(this.categories=a.data.data||[])}}catch(a){console.error("Error loading categories:",a),this.loadCategoriesFromStorage()}}loadBudgetsFromStorage(){const e=localStorage.getItem("advanced_budget_budgets");if(e)try{this.budgets=JSON.parse(e)}catch(t){console.error("Error loading budgets from storage:",t)}}loadExpensesFromStorage(){const e=localStorage.getItem("advanced_budget_expenses");if(e)try{this.expenses=JSON.parse(e)}catch(t){console.error("Error loading expenses from storage:",t)}}loadRevenuesFromStorage(){const e=localStorage.getItem("advanced_budget_revenues");if(e)try{this.revenues=JSON.parse(e)}catch(t){console.error("Error loading revenues from storage:",t)}}loadCategoriesFromStorage(){const e=localStorage.getItem("advanced_budget_categories");if(e)try{this.categories=JSON.parse(e)}catch(t){console.error("Error loading categories from storage:",t)}}saveBudgetsToStorage(){localStorage.setItem("advanced_budget_budgets",JSON.stringify(this.budgets))}initializeDefaultData(){this.budgets.length===0&&(this.budgets=[{id:1,name:"ميزانية 2025",year:2025,totalAmount:1e6,allocatedAmount:0,remainingAmount:1e6,status:"active",createdAt:new Date().toISOString()}],this.saveBudgetsToStorage())}async syncPendingChanges(){this.useAPI}getBudgetStats(){const e=this.budgets.reduce((n,r)=>n+(r.totalAmount||0),0),t=this.expenses.reduce((n,r)=>n+(r.amount||0),0),s=this.revenues.reduce((n,r)=>n+(r.amount||0),0),a=s-t;return{totalBudget:e,totalExpenses:t,totalRevenues:s,balance:a,utilizationRate:e>0?t/e*100:0}}filterByCategory(e){this.filterCategory=e===this.filterCategory?"all":e,this.renderAdvancedBudget()}searchItems(e){this.searchQuery=e,this.renderAdvancedBudget()}renderAdvancedBudget(){const e=document.getElementById("advanced-budget-container")||document.body,t=this.getBudgetStats();e.innerHTML=`
      <div class="advanced-budget">
        <div class="header-section">
          <h2><i class="fas fa-money-bill-wave"></i> نظام إدارة الميزانية المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedBudget.showCreateModal()">
              <i class="fas fa-plus"></i> ميزانية جديدة
            </button>
            <button class="btn btn-info" onclick="advancedBudget.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="stats-section">
          <div class="stat-card stat-budget">
            <div class="stat-icon">
              <i class="fas fa-wallet"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي الميزانية</h3>
              <p class="stat-value">${this.formatCurrency(t.totalBudget)}</p>
            </div>
          </div>
          <div class="stat-card stat-expenses">
            <div class="stat-icon">
              <i class="fas fa-arrow-down"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي المصروفات</h3>
              <p class="stat-value">${this.formatCurrency(t.totalExpenses)}</p>
            </div>
          </div>
          <div class="stat-card stat-revenues">
            <div class="stat-icon">
              <i class="fas fa-arrow-up"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي الإيرادات</h3>
              <p class="stat-value">${this.formatCurrency(t.totalRevenues)}</p>
            </div>
          </div>
          <div class="stat-card stat-balance ${t.balance>=0?"positive":"negative"}">
            <div class="stat-icon">
              <i class="fas fa-balance-scale"></i>
            </div>
            <div class="stat-content">
              <h3>الرصيد</h3>
              <p class="stat-value">${this.formatCurrency(t.balance)}</p>
            </div>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="overview"?"active":""}" onclick="advancedBudget.switchView('overview')">
            <i class="fas fa-chart-pie"></i> نظرة عامة
          </button>
          <button class="tab-btn ${this.currentView==="budgets"?"active":""}" onclick="advancedBudget.switchView('budgets')">
            <i class="fas fa-file-invoice-dollar"></i> الميزانيات
          </button>
          <button class="tab-btn ${this.currentView==="expenses"?"active":""}" onclick="advancedBudget.switchView('expenses')">
            <i class="fas fa-money-check-alt"></i> المصروفات
          </button>
          <button class="tab-btn ${this.currentView==="revenues"?"active":""}" onclick="advancedBudget.switchView('revenues')">
            <i class="fas fa-hand-holding-usd"></i> الإيرادات
          </button>
          <button class="tab-btn ${this.currentView==="categories"?"active":""}" onclick="advancedBudget.switchView('categories')">
            <i class="fas fa-tags"></i> الفئات
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"overview":return this.renderOverview();case"budgets":return this.renderBudgets();case"expenses":return this.renderExpenses();case"revenues":return this.renderRevenues();case"categories":return this.renderCategories();default:return this.renderOverview()}}renderOverview(){const t=this.getBudgetStats().utilizationRate;return`
      <div class="overview-view">
        <div class="overview-cards">
          <div class="overview-card">
            <h3>معدل الاستخدام</h3>
            <div class="progress-ring">
              <svg class="progress-ring-svg" width="120" height="120">
                <circle class="progress-ring-circle-bg" cx="60" cy="60" r="50"></circle>
                <circle class="progress-ring-circle" cx="60" cy="60" r="50" 
                        style="stroke-dashoffset: ${314-t/100*314}"></circle>
              </svg>
              <div class="progress-ring-text">${t.toFixed(1)}%</div>
            </div>
          </div>
          <div class="overview-card">
            <h3>أحدث المصروفات</h3>
            <div class="recent-list">
              ${this.expenses.slice(0,5).map(s=>`
                <div class="recent-item">
                  <div class="recent-info">
                    <span class="recent-title">${s.description||"مصروف"}</span>
                    <span class="recent-date">${new Date(s.date).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <span class="recent-amount">${this.formatCurrency(s.amount||0)}</span>
                </div>
              `).join("")||'<p class="empty-state">لا توجد مصروفات</p>'}
            </div>
          </div>
          <div class="overview-card">
            <h3>أحدث الإيرادات</h3>
            <div class="recent-list">
              ${this.revenues.slice(0,5).map(s=>`
                <div class="recent-item">
                  <div class="recent-info">
                    <span class="recent-title">${s.description||"إيراد"}</span>
                    <span class="recent-date">${new Date(s.date).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <span class="recent-amount">${this.formatCurrency(s.amount||0)}</span>
                </div>
              `).join("")||'<p class="empty-state">لا توجد إيرادات</p>'}
            </div>
          </div>
        </div>
      </div>
    `}renderBudgets(){return`
      <div class="budgets-view">
        <div class="budgets-list">
          ${this.budgets.map(e=>{const t=e.totalAmount>0?e.allocatedAmount/e.totalAmount*100:0;return`
              <div class="budget-card">
                <div class="budget-header">
                  <h4>${e.name}</h4>
                  <span class="budget-status status-${e.status}">
                    ${this.getStatusName(e.status)}
                  </span>
                </div>
                <div class="budget-body">
                  <div class="budget-amounts">
                    <div class="amount-item">
                      <span class="amount-label">إجمالي الميزانية:</span>
                      <span class="amount-value">${this.formatCurrency(e.totalAmount||0)}</span>
                    </div>
                    <div class="amount-item">
                      <span class="amount-label">المخصص:</span>
                      <span class="amount-value">${this.formatCurrency(e.allocatedAmount||0)}</span>
                    </div>
                    <div class="amount-item">
                      <span class="amount-label">المتبقي:</span>
                      <span class="amount-value">${this.formatCurrency(e.remainingAmount||0)}</span>
                    </div>
                  </div>
                  <div class="budget-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${t}%"></div>
                    </div>
                    <span class="progress-text">${t.toFixed(1)}% مستخدم</span>
                  </div>
                </div>
                <div class="budget-footer">
                  <div class="budget-actions">
                    <button class="btn btn-sm btn-primary" onclick="advancedBudget.viewBudget(${e.id})">
                      <i class="fas fa-eye"></i> عرض
                    </button>
                    <button class="btn btn-sm btn-success" onclick="advancedBudget.editBudget(${e.id})">
                      <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="advancedBudget.deleteBudget(${e.id})">
                      <i class="fas fa-trash"></i> حذف
                    </button>
                  </div>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا توجد ميزانيات</p>'}
        </div>
      </div>
    `}renderExpenses(){return`
      <div class="expenses-view">
        <div class="expenses-list">
          ${this.expenses.map(e=>`
            <div class="expense-card">
              <div class="expense-header">
                <h4>${e.description||"مصروف"}</h4>
                <span class="expense-amount">${this.formatCurrency(e.amount||0)}</span>
              </div>
              <div class="expense-body">
                <div class="expense-details">
                  <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(e.date).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-tag"></i>
                    <span>${e.category||"غير محدد"}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-file-invoice"></i>
                    <span>${e.budgetName||"غير محدد"}</span>
                  </div>
                </div>
              </div>
              <div class="expense-footer">
                <div class="expense-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedBudget.viewExpense(${e.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedBudget.editExpense(${e.id})">
                    <i class="fas fa-edit"></i> تعديل
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="advancedBudget.deleteExpense(${e.id})">
                    <i class="fas fa-trash"></i> حذف
                  </button>
                </div>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد مصروفات</p>'}
        </div>
      </div>
    `}renderRevenues(){return`
      <div class="revenues-view">
        <div class="revenues-list">
          ${this.revenues.map(e=>`
            <div class="revenue-card">
              <div class="revenue-header">
                <h4>${e.description||"إيراد"}</h4>
                <span class="revenue-amount">${this.formatCurrency(e.amount||0)}</span>
              </div>
              <div class="revenue-body">
                <div class="revenue-details">
                  <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(e.date).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-tag"></i>
                    <span>${e.category||"غير محدد"}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-file-invoice"></i>
                    <span>${e.budgetName||"غير محدد"}</span>
                  </div>
                </div>
              </div>
              <div class="revenue-footer">
                <div class="revenue-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedBudget.viewRevenue(${e.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedBudget.editRevenue(${e.id})">
                    <i class="fas fa-edit"></i> تعديل
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="advancedBudget.deleteRevenue(${e.id})">
                    <i class="fas fa-trash"></i> حذف
                  </button>
                </div>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد إيرادات</p>'}
        </div>
      </div>
    `}renderCategories(){return`
      <div class="categories-view">
        <div class="categories-grid">
          ${this.categories.map(e=>{const t=this.expenses.filter(a=>a.categoryId===e.id),s=t.reduce((a,n)=>a+(n.amount||0),0);return`
              <div class="category-card">
                <div class="category-header">
                  <h4>${e.name}</h4>
                  <span class="category-icon" style="background: ${e.color||"#667eea"}">
                    <i class="${e.icon||"fas fa-tag"}"></i>
                  </span>
                </div>
                <div class="category-body">
                  <div class="category-stats">
                    <div class="stat-item">
                      <span>عدد المعاملات:</span>
                      <span>${t.length}</span>
                    </div>
                    <div class="stat-item">
                      <span>إجمالي المصروفات:</span>
                      <span>${this.formatCurrency(s)}</span>
                    </div>
                  </div>
                </div>
                <div class="category-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedBudget.viewCategory(${e.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedBudget.editCategory(${e.id})">
                    <i class="fas fa-edit"></i> تعديل
                  </button>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا توجد فئات</p>'}
        </div>
      </div>
    `}formatCurrency(e){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR"}).format(e)}getStatusName(e){return{active:"نشط",inactive:"غير نشط",closed:"مغلق",draft:"مسودة"}[e]||e}switchView(e){this.currentView=e,this.renderAdvancedBudget()}viewBudget(e){alert(`عرض الميزانية #${e} - سيتم التطوير قريباً`)}editBudget(e){alert(`تعديل الميزانية #${e} - سيتم التطوير قريباً`)}async deleteBudget(e){var t,s,a;if(confirm("هل أنت متأكد من حذف هذه الميزانية؟"))try{this.useAPI&&d?(a=(await d.delete(((s=(t=i==null?void 0:i.advancedBudget)==null?void 0:t.budgets)==null?void 0:s.delete)||`/api/advanced-budget/budgets/${e}`)).data)!=null&&a.success&&(c&&c.clear(["budget"]),await this.loadBudgets(),typeof showToast=="function"&&showToast("تم حذف الميزانية","success")):(this.budgets=this.budgets.filter(n=>n.id!==e),this.saveBudgetsToStorage(),this.renderAdvancedBudget())}catch(n){console.error("Error deleting budget:",n),typeof showToast=="function"&&showToast("فشل حذف الميزانية","error")}}viewExpense(e){alert(`عرض المصروف #${e} - سيتم التطوير قريباً`)}editExpense(e){alert(`تعديل المصروف #${e} - سيتم التطوير قريباً`)}deleteExpense(e){alert(`حذف المصروف #${e} - سيتم التطوير قريباً`)}viewRevenue(e){alert(`عرض الإيراد #${e} - سيتم التطوير قريباً`)}editRevenue(e){alert(`تعديل الإيراد #${e} - سيتم التطوير قريباً`)}deleteRevenue(e){alert(`حذف الإيراد #${e} - سيتم التطوير قريباً`)}viewCategory(e){alert(`عرض الفئة #${e} - سيتم التطوير قريباً`)}editCategory(e){alert(`تعديل الفئة #${e} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء ميزانية - سيتم التطوير قريباً")}async refresh(){c&&c.clear(["budget"]),await this.loadBudgets(),await this.loadExpenses(),await this.loadRevenues(),await this.loadCategories(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const h=new p;typeof window<"u"&&(window.advancedBudget=h,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(h,"advancedBudget"));typeof v<"u"&&v.exports&&(v.exports=p)});export default w();
//# sourceMappingURL=rehabilitation-center-advanced-budget-CtG1qQUL.js.map
