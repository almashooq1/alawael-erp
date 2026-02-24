import{a as r,A as o,c as p,r as v,s as h,b as m,d as g}from"./main-DFR0ngT_.js";class y{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=r,this.API_ENDPOINTS=o.advancedGoalsPlans||{},this.connectionManager=p,this.realtimeSync=v,this.systemEnhancer=h,this.aiAssistant=m,this.advancedCache=g,this.goals=[],this.plans=[],this.objectives=[],this.milestones=[],this.tasks=[],this.progress=[],this.reviews=[],this.recommendations=[],this.analytics=[],this.currentView="goals",this.filters={status:"all",priority:"all",category:"all",patient:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-goals-plans">
        <div class="goals-plans-header">
          <h2>🎯 نظام إدارة الأهداف والخطط المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createGoal()">
              <i class="fas fa-plus"></i> هدف جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createPlan()">
              <i class="fas fa-clipboard-list"></i> خطة جديدة
            </button>
          </div>
        </div>

        <div class="goals-plans-tabs">
          <button class="tab-btn ${this.currentView==="goals"?"active":""}" 
                  onclick="this.switchView('goals')">
            <i class="fas fa-bullseye"></i> الأهداف
          </button>
          <button class="tab-btn ${this.currentView==="plans"?"active":""}" 
                  onclick="this.switchView('plans')">
            <i class="fas fa-clipboard-list"></i> الخطط
          </button>
          <button class="tab-btn ${this.currentView==="objectives"?"active":""}" 
                  onclick="this.switchView('objectives')">
            <i class="fas fa-list-check"></i> الأهداف الفرعية
          </button>
          <button class="tab-btn ${this.currentView==="milestones"?"active":""}" 
                  onclick="this.switchView('milestones')">
            <i class="fas fa-flag-checkered"></i> المعالم
          </button>
          <button class="tab-btn ${this.currentView==="tasks"?"active":""}" 
                  onclick="this.switchView('tasks')">
            <i class="fas fa-tasks"></i> المهام
          </button>
          <button class="tab-btn ${this.currentView==="progress"?"active":""}" 
                  onclick="this.switchView('progress')">
            <i class="fas fa-chart-line"></i> التقدم
          </button>
          <button class="tab-btn ${this.currentView==="reviews"?"active":""}" 
                  onclick="this.switchView('reviews')">
            <i class="fas fa-clipboard-check"></i> المراجعات
          </button>
          <button class="tab-btn ${this.currentView==="recommendations"?"active":""}" 
                  onclick="this.switchView('recommendations')">
            <i class="fas fa-lightbulb"></i> التوصيات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="goals-plans-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('priority', event)">
            <option value="all">جميع الأولويات</option>
            <option value="low">منخفض</option>
            <option value="medium">متوسط</option>
            <option value="high">عالي</option>
            <option value="urgent">عاجل</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="goals-plans-content" id="goalsPlansContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"goals":return this.renderGoals();case"plans":return this.renderPlans();case"objectives":return this.renderObjectives();case"milestones":return this.renderMilestones();case"tasks":return this.renderTasks();case"progress":return this.renderProgress();case"reviews":return this.renderReviews();case"recommendations":return this.renderRecommendations();case"analytics":return this.renderAnalytics();default:return this.renderGoals()}}renderGoals(){const s=this.getFilteredData(this.goals);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-bullseye"></i>
          <p>لا توجد أهداف</p>
          <button class="btn btn-primary" onclick="this.createGoal()">
            إضافة هدف جديد
          </button>
        </div>
      `:`
      <div class="goals-grid">
        ${s.map(a=>`
          <div class="goal-card status-${a.status} priority-${a.priority}">
            <div class="goal-header">
              <div class="goal-info">
                <h3>${a.title||"هدف"}</h3>
                <p class="goal-category">${this.getCategoryText(a.category)}</p>
              </div>
              <div class="goal-badges">
                <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
                <span class="priority-badge priority-${a.priority}">${this.getPriorityText(a.priority)}</span>
              </div>
            </div>
            <div class="goal-body">
              <div class="goal-description">
                <p>${a.description||""}</p>
              </div>
              <div class="goal-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموعد النهائي:</span>
                  <span class="detail-value">${this.formatDate(a.deadline)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الأهداف الفرعية:</span>
                  <span class="detail-value">${a.objectivesCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المهام:</span>
                  <span class="detail-value">${a.tasksCount||0}</span>
                </div>
              </div>
              <div class="goal-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${a.progress||0}%"></div>
                </div>
                <span>${a.progress||0}%</span>
              </div>
            </div>
            <div class="goal-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewGoal(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.updateGoalProgress(${a.id})">
                <i class="fas fa-sync"></i> تحديث
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editGoal(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPlans(){return this.plans.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>لا توجد خطط</p>
          <button class="btn btn-primary" onclick="this.createPlan()">
            إضافة خطة جديدة
          </button>
        </div>
      `:`
      <div class="plans-list">
        ${this.plans.map(s=>`
          <div class="plan-card status-${s.status}">
            <div class="plan-header">
              <div class="plan-info">
                <h3>${s.name||"خطة"}</h3>
                <p class="plan-type">${this.getTypeText(s.type)}</p>
              </div>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="plan-body">
              <div class="plan-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(s.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(s.endDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأهداف:</span>
                  <span class="detail-value">${s.goalsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المعالم:</span>
                  <span class="detail-value">${s.milestonesCount||0}</span>
                </div>
              </div>
              <div class="plan-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${s.progress||0}%"></div>
                </div>
                <span>${s.progress||0}%</span>
              </div>
            </div>
            <div class="plan-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewPlan(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editPlan(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderObjectives(){return this.objectives.length===0?`
        <div class="empty-state">
          <i class="fas fa-list-check"></i>
          <p>لا توجد أهداف فرعية</p>
        </div>
      `:`
      <div class="objectives-list">
        ${this.objectives.map(s=>`
          <div class="objective-card ${s.completed?"completed":""}">
            <div class="objective-header">
              <h3>${s.title||"هدف فرعي"}</h3>
              <div class="objective-badges">
                <span class="goal-badge">${s.goalName||"غير محدد"}</span>
                ${s.completed?`
                  <span class="completed-badge">
                    <i class="fas fa-check-circle"></i> مكتمل
                  </span>
                `:""}
              </div>
            </div>
            <div class="objective-body">
              <p>${s.description||""}</p>
              <div class="objective-details">
                <div class="detail-item">
                  <span class="detail-label">الموعد النهائي:</span>
                  <span class="detail-value">${this.formatDate(s.deadline)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${s.progress||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderMilestones(){return this.milestones.length===0?`
        <div class="empty-state">
          <i class="fas fa-flag-checkered"></i>
          <p>لا توجد معالم</p>
        </div>
      `:`
      <div class="milestones-list">
        ${this.milestones.map(s=>`
          <div class="milestone-card ${s.achieved?"achieved":""}">
            <div class="milestone-header">
              <h3>${s.name||"معلم"}</h3>
              <div class="milestone-badges">
                <span class="plan-badge">${s.planName||"غير محدد"}</span>
                ${s.achieved?`
                  <span class="achieved-badge">
                    <i class="fas fa-check-circle"></i> محقق
                  </span>
                `:""}
              </div>
            </div>
            <div class="milestone-body">
              <div class="milestone-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ المستهدف:</span>
                  <span class="detail-value">${this.formatDate(s.targetDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ التحقيق:</span>
                  <span class="detail-value">${s.achievedDate?this.formatDate(s.achievedDate):"لم يتحقق بعد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTasks(){return this.tasks.length===0?`
        <div class="empty-state">
          <i class="fas fa-tasks"></i>
          <p>لا توجد مهام</p>
        </div>
      `:`
      <div class="tasks-list">
        ${this.tasks.map(s=>`
          <div class="task-card status-${s.status} priority-${s.priority}">
            <div class="task-header">
              <h3>${s.title||"مهمة"}</h3>
              <div class="task-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                <span class="priority-badge priority-${s.priority}">${this.getPriorityText(s.priority)}</span>
              </div>
            </div>
            <div class="task-body">
              <p>${s.description||""}</p>
              <div class="task-details">
                <div class="detail-item">
                  <span class="detail-label">الهدف:</span>
                  <span class="detail-value">${s.goalName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموعد النهائي:</span>
                  <span class="detail-value">${this.formatDate(s.deadline)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المسؤول:</span>
                  <span class="detail-value">${s.assigneeName||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="task-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewTask(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.completeTask(${s.id})">
                <i class="fas fa-check"></i> إكمال
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderProgress(){return this.progress.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <p>لا توجد بيانات تقدم</p>
        </div>
      `:`
      <div class="progress-dashboard">
        ${this.progress.map(s=>{var a;return`
          <div class="progress-card">
            <div class="progress-header">
              <h3>${s.goalName||s.planName||"غير محدد"}</h3>
              <span class="progress-type">${s.type||"هدف"}</span>
            </div>
            <div class="progress-body">
              <div class="progress-metrics">
                <div class="metric-item">
                  <span class="metric-label">التقدم الإجمالي:</span>
                  <span class="metric-value">${s.overallProgress||0}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">الأهداف المكتملة:</span>
                  <span class="metric-value">${s.completedGoals||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">المهام المكتملة:</span>
                  <span class="metric-value">${s.completedTasks||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">المعالم المحققة:</span>
                  <span class="metric-value">${s.achievedMilestones||0}</span>
                </div>
              </div>
              <div class="progress-timeline">
                ${((a=s.history)==null?void 0:a.map((t,e)=>`
                  <div class="timeline-point">
                    <div class="timeline-date">${this.formatDate(t.date)}</div>
                    <div class="timeline-progress">${t.progress||0}%</div>
                  </div>
                `).join(""))||""}
              </div>
            </div>
          </div>
        `}).join("")}
      </div>
    `}renderReviews(){return this.reviews.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-check"></i>
          <p>لا توجد مراجعات</p>
        </div>
      `:`
      <div class="reviews-list">
        ${this.reviews.map(s=>`
          <div class="review-card">
            <div class="review-header">
              <h3>${s.title||"مراجعة"}</h3>
              <span class="review-date">${this.formatDate(s.date)}</span>
            </div>
            <div class="review-body">
              <div class="review-details">
                <div class="detail-item">
                  <span class="detail-label">الهدف/الخطة:</span>
                  <span class="detail-value">${s.targetName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المراجع:</span>
                  <span class="detail-value">${s.reviewerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقييم:</span>
                  <span class="detail-value">${s.rating||"غير محدد"}</span>
                </div>
              </div>
              <div class="review-comments">
                <p>${s.comments||""}</p>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRecommendations(){return this.recommendations.length===0?`
        <div class="empty-state">
          <i class="fas fa-lightbulb"></i>
          <p>لا توجد توصيات</p>
        </div>
      `:`
      <div class="recommendations-list">
        ${this.recommendations.map(s=>`
          <div class="recommendation-card priority-${s.priority||"medium"}">
            <div class="recommendation-header">
              <h3>${s.title||"توصية"}</h3>
              <span class="priority-badge priority-${s.priority||"medium"}">
                ${this.getPriorityText(s.priority||"medium")}
              </span>
            </div>
            <div class="recommendation-body">
              <p>${s.description||""}</p>
              <div class="recommendation-details">
                <div class="detail-item">
                  <span class="detail-label">الهدف/الخطة:</span>
                  <span class="detail-value">${s.targetName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التأثير المتوقع:</span>
                  <span class="detail-value">${s.expectedImpact||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="recommendation-actions">
              <button class="btn btn-sm btn-primary" onclick="this.applyRecommendation(${s.id})">
                <i class="fas fa-check"></i> تطبيق
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
    `}getFilteredData(s){let a=[...s];return this.filters.status!=="all"&&(a=a.filter(t=>t.status===this.filters.status)),this.filters.priority!=="all"&&(a=a.filter(t=>t.priority===this.filters.priority)),this.filters.category!=="all"&&(a=a.filter(t=>t.category===this.filters.category)),this.filters.patient!=="all"&&(a=a.filter(t=>t.patientId===parseInt(this.filters.patient))),a}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,a,t,e,i,l,n,c,d]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.goals||"/api/advanced-goals-plans/goals"),this.apiClient.get(this.API_ENDPOINTS.plans||"/api/advanced-goals-plans/plans"),this.apiClient.get(this.API_ENDPOINTS.objectives||"/api/advanced-goals-plans/objectives"),this.apiClient.get(this.API_ENDPOINTS.milestones||"/api/advanced-goals-plans/milestones"),this.apiClient.get(this.API_ENDPOINTS.tasks||"/api/advanced-goals-plans/tasks"),this.apiClient.get(this.API_ENDPOINTS.progress||"/api/advanced-goals-plans/progress"),this.apiClient.get(this.API_ENDPOINTS.reviews||"/api/advanced-goals-plans/reviews"),this.apiClient.get(this.API_ENDPOINTS.recommendations||"/api/advanced-goals-plans/recommendations"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-goals-plans/analytics")]);this.goals=s.data||[],this.plans=a.data||[],this.objectives=t.data||[],this.milestones=e.data||[],this.tasks=i.data||[],this.progress=l.data||[],this.reviews=n.data||[],this.recommendations=c.data||[],this.analytics=d.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading goals and plans data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-goals-plans","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,a){this.filters[s]=a.target.value,this.updateContent()}handleSearch(s){this.updateContent()}updateContent(){const s=document.getElementById("goalsPlansContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{pending:"قيد الانتظار","in-progress":"قيد التنفيذ",completed:"مكتمل",cancelled:"ملغي"}[s]||s}getPriorityText(s){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[s]||s}getCategoryText(s){return{physical:"جسدي",cognitive:"إدراكي",speech:"نطق",behavioral:"سلوكي",social:"اجتماعي"}[s]||s}getTypeText(s){return{treatment:"علاجي",rehabilitation:"تأهيلي",educational:"تعليمي",social:"اجتماعي"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedGoals",JSON.stringify(this.goals)),localStorage.setItem("advancedPlans",JSON.stringify(this.plans)),localStorage.setItem("advancedObjectives",JSON.stringify(this.objectives)),localStorage.setItem("advancedMilestones",JSON.stringify(this.milestones)),localStorage.setItem("advancedTasks",JSON.stringify(this.tasks)),localStorage.setItem("advancedProgress",JSON.stringify(this.progress)),localStorage.setItem("advancedReviews",JSON.stringify(this.reviews)),localStorage.setItem("advancedRecommendations",JSON.stringify(this.recommendations)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.goals=JSON.parse(localStorage.getItem("advancedGoals")||"[]"),this.plans=JSON.parse(localStorage.getItem("advancedPlans")||"[]"),this.objectives=JSON.parse(localStorage.getItem("advancedObjectives")||"[]"),this.milestones=JSON.parse(localStorage.getItem("advancedMilestones")||"[]"),this.tasks=JSON.parse(localStorage.getItem("advancedTasks")||"[]"),this.progress=JSON.parse(localStorage.getItem("advancedProgress")||"[]"),this.reviews=JSON.parse(localStorage.getItem("advancedReviews")||"[]"),this.recommendations=JSON.parse(localStorage.getItem("advancedRecommendations")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createGoal=this.createGoal.bind(this),this.createPlan=this.createPlan.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewGoal=this.viewGoal.bind(this),this.updateGoalProgress=this.updateGoalProgress.bind(this),this.editGoal=this.editGoal.bind(this),this.viewPlan=this.viewPlan.bind(this),this.editPlan=this.editPlan.bind(this),this.viewTask=this.viewTask.bind(this),this.completeTask=this.completeTask.bind(this),this.applyRecommendation=this.applyRecommendation.bind(this)}async createGoal(){console.log("Create goal")}async createPlan(){console.log("Create plan")}async viewGoal(s){console.log("View goal",s)}async updateGoalProgress(s){console.log("Update goal progress",s)}async editGoal(s){console.log("Edit goal",s)}async viewPlan(s){console.log("View plan",s)}async editPlan(s){console.log("Edit plan",s)}async viewTask(s){console.log("View task",s)}async completeTask(s){console.log("Complete task",s)}async applyRecommendation(s){console.log("Apply recommendation",s)}}export{y as default};
//# sourceMappingURL=rehabilitation-center-advanced-goals-plans-BYxuuxFd.js.map
