import{a as c,A as d,c as r,r as p,s as v,b as h,d as u}from"./main-DFR0ngT_.js";class g{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=c,this.API_ENDPOINTS=d.advancedEvaluations||{},this.connectionManager=r,this.realtimeSync=p,this.systemEnhancer=v,this.aiAssistant=h,this.advancedCache=u,this.evaluations=[],this.templates=[],this.questions=[],this.responses=[],this.scores=[],this.reports=[],this.comparisons=[],this.analytics=[],this.currentView="evaluations",this.filters={status:"all",type:"all",category:"all",patient:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-evaluations-management">
        <div class="evaluations-header">
          <h2>📊 نظام إدارة التقييمات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createEvaluation()">
              <i class="fas fa-plus"></i> تقييم جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createTemplate()">
              <i class="fas fa-file-alt"></i> قالب جديد
            </button>
          </div>
        </div>

        <div class="evaluations-tabs">
          <button class="tab-btn ${this.currentView==="evaluations"?"active":""}" 
                  onclick="this.switchView('evaluations')">
            <i class="fas fa-clipboard-check"></i> التقييمات
          </button>
          <button class="tab-btn ${this.currentView==="templates"?"active":""}" 
                  onclick="this.switchView('templates')">
            <i class="fas fa-file-alt"></i> القوالب
          </button>
          <button class="tab-btn ${this.currentView==="questions"?"active":""}" 
                  onclick="this.switchView('questions')">
            <i class="fas fa-question-circle"></i> الأسئلة
          </button>
          <button class="tab-btn ${this.currentView==="responses"?"active":""}" 
                  onclick="this.switchView('responses')">
            <i class="fas fa-comment-dots"></i> الإجابات
          </button>
          <button class="tab-btn ${this.currentView==="scores"?"active":""}" 
                  onclick="this.switchView('scores')">
            <i class="fas fa-star"></i> الدرجات
          </button>
          <button class="tab-btn ${this.currentView==="reports"?"active":""}" 
                  onclick="this.switchView('reports')">
            <i class="fas fa-file-chart-line"></i> التقارير
          </button>
          <button class="tab-btn ${this.currentView==="comparisons"?"active":""}" 
                  onclick="this.switchView('comparisons')">
            <i class="fas fa-balance-scale"></i> المقارنات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="evaluations-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
            <option value="reviewed">تمت المراجعة</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="initial">ابتدائي</option>
            <option value="progress">تقدم</option>
            <option value="final">نهائي</option>
            <option value="periodic">دوري</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="evaluations-content" id="evaluationsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"evaluations":return this.renderEvaluations();case"templates":return this.renderTemplates();case"questions":return this.renderQuestions();case"responses":return this.renderResponses();case"scores":return this.renderScores();case"reports":return this.renderReports();case"comparisons":return this.renderComparisons();case"analytics":return this.renderAnalytics();default:return this.renderEvaluations()}}renderEvaluations(){const s=this.getFilteredData(this.evaluations);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-check"></i>
          <p>لا توجد تقييمات</p>
          <button class="btn btn-primary" onclick="this.createEvaluation()">
            إضافة تقييم جديد
          </button>
        </div>
      `:`
      <div class="evaluations-list">
        ${s.map(a=>`
          <div class="evaluation-card status-${a.status} type-${a.type}">
            <div class="evaluation-header">
              <div class="evaluation-info">
                <h3>${a.title||"تقييم"}</h3>
                <p class="evaluation-patient">المريض: ${a.patientName||"غير محدد"}</p>
              </div>
              <div class="evaluation-badges">
                <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
                <span class="type-badge">${this.getTypeText(a.type)}</span>
              </div>
            </div>
            <div class="evaluation-body">
              <div class="evaluation-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المقيّم:</span>
                  <span class="detail-value">${a.evaluatorName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأسئلة:</span>
                  <span class="detail-value">${a.questionsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الإجابات:</span>
                  <span class="detail-value">${a.responsesCount||0}</span>
                </div>
                ${a.score!==void 0?`
                  <div class="detail-item">
                    <span class="detail-label">الدرجة:</span>
                    <span class="detail-value score-${this.getScoreLevel(a.score)}">
                      ${a.score}%
                    </span>
                  </div>
                `:""}
              </div>
              ${a.summary?`
                <div class="evaluation-summary">
                  <span class="summary-label">الملخص:</span>
                  <span class="summary-text">${a.summary.substring(0,150)}${a.summary.length>150?"...":""}</span>
                </div>
              `:""}
            </div>
            <div class="evaluation-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewEvaluation(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${a.status==="draft"?`
                <button class="btn btn-sm btn-success" onclick="this.startEvaluation(${a.id})">
                  <i class="fas fa-play"></i> بدء
                </button>
              `:""}
              ${a.status==="in-progress"?`
                <button class="btn btn-sm btn-warning" onclick="this.completeEvaluation(${a.id})">
                  <i class="fas fa-check"></i> إكمال
                </button>
              `:""}
              <button class="btn btn-sm btn-secondary" onclick="this.editEvaluation(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTemplates(){return this.templates.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>لا توجد قوالب</p>
          <button class="btn btn-primary" onclick="this.createTemplate()">
            إضافة قالب جديد
          </button>
        </div>
      `:`
      <div class="templates-grid">
        ${this.templates.map(s=>`
          <div class="template-card">
            <div class="template-header">
              <h3>${s.name||"قالب"}</h3>
              <span class="template-category">${this.getCategoryText(s.category)}</span>
            </div>
            <div class="template-body">
              <div class="template-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأسئلة:</span>
                  <span class="detail-value">${s.questionsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">آخر استخدام:</span>
                  <span class="detail-value">${this.formatDate(s.lastUsed)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الاستخدامات:</span>
                  <span class="detail-value">${s.usageCount||0}</span>
                </div>
              </div>
            </div>
            <div class="template-actions">
              <button class="btn btn-sm btn-primary" onclick="this.useTemplate(${s.id})">
                <i class="fas fa-check"></i> استخدام
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editTemplate(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderQuestions(){return this.questions.length===0?`
        <div class="empty-state">
          <i class="fas fa-question-circle"></i>
          <p>لا توجد أسئلة</p>
        </div>
      `:`
      <div class="questions-list">
        ${this.questions.map(s=>`
          <div class="question-card type-${s.type}">
            <div class="question-header">
              <h3>${s.text||"سؤال"}</h3>
              <span class="question-type">${this.getQuestionTypeText(s.type)}</span>
            </div>
            <div class="question-body">
              <div class="question-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${s.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوزن:</span>
                  <span class="detail-value">${s.weight||1}</span>
                </div>
                ${s.options?`
                  <div class="question-options">
                    <span class="options-label">الخيارات:</span>
                    <ul>
                      ${s.options.map(a=>`
                        <li>${a}</li>
                      `).join("")}
                    </ul>
                  </div>
                `:""}
              </div>
            </div>
            <div class="question-actions">
              <button class="btn btn-sm btn-secondary" onclick="this.editQuestion(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderResponses(){return this.responses.length===0?`
        <div class="empty-state">
          <i class="fas fa-comment-dots"></i>
          <p>لا توجد إجابات</p>
        </div>
      `:`
      <div class="responses-list">
        ${this.responses.map(s=>`
          <div class="response-card">
            <div class="response-header">
              <h3>${s.questionText||"إجابة"}</h3>
              <span class="response-date">${this.formatDateTime(s.date)}</span>
            </div>
            <div class="response-body">
              <div class="response-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقييم:</span>
                  <span class="detail-value">${s.evaluationTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الإجابة:</span>
                  <span class="detail-value">${s.answer||"غير محدد"}</span>
                </div>
                ${s.score!==void 0?`
                  <div class="detail-item">
                    <span class="detail-label">الدرجة:</span>
                    <span class="detail-value">${s.score}</span>
                  </div>
                `:""}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderScores(){return this.scores.length===0?`
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <p>لا توجد درجات</p>
        </div>
      `:`
      <div class="scores-list">
        ${this.scores.map(s=>`
          <div class="score-card level-${this.getScoreLevel(s.totalScore)}">
            <div class="score-header">
              <h3>${s.evaluationTitle||"درجة"}</h3>
              <span class="score-value score-${this.getScoreLevel(s.totalScore)}">
                ${s.totalScore}%
              </span>
            </div>
            <div class="score-body">
              <div class="score-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الدرجة الكلية:</span>
                  <span class="detail-value">${s.totalScore}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الدرجة القصوى:</span>
                  <span class="detail-value">${s.maxScore||100}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأسئلة:</span>
                  <span class="detail-value">${s.questionsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الإجابات:</span>
                  <span class="detail-value">${s.responsesCount||0}</span>
                </div>
              </div>
              ${s.breakdown?`
                <div class="score-breakdown">
                  <span class="breakdown-label">التفاصيل:</span>
                  <div class="breakdown-items">
                    ${Object.entries(s.breakdown).map(([a,t])=>`
                      <div class="breakdown-item">
                        <span class="breakdown-key">${a}:</span>
                        <span class="breakdown-value">${t}%</span>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `:""}
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
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد التقييمات:</span>
                  <span class="detail-value">${s.evaluationsCount||0}</span>
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
    `}renderComparisons(){return this.comparisons.length===0?`
        <div class="empty-state">
          <i class="fas fa-balance-scale"></i>
          <p>لا توجد مقارنات</p>
        </div>
      `:`
      <div class="comparisons-list">
        ${this.comparisons.map(s=>`
          <div class="comparison-card">
            <div class="comparison-header">
              <h3>${s.title||"مقارنة"}</h3>
              <span class="comparison-date">${this.formatDate(s.date)}</span>
            </div>
            <div class="comparison-body">
              <div class="comparison-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد التقييمات:</span>
                  <span class="detail-value">${s.evaluationsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفترة:</span>
                  <span class="detail-value">${s.period||"غير محدد"}</span>
                </div>
              </div>
              ${s.changes?`
                <div class="comparison-changes">
                  <span class="changes-label">التغييرات:</span>
                  <div class="changes-items">
                    ${s.changes.map(a=>`
                      <div class="change-item ${a.positive?"positive":"negative"}">
                        <span class="change-key">${a.key}:</span>
                        <span class="change-value">${a.value>0?"+":""}${a.value}%</span>
                      </div>
                    `).join("")}
                  </div>
                </div>
              `:""}
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
    `}getFilteredData(s){let a=[...s];return this.filters.status!=="all"&&(a=a.filter(t=>t.status===this.filters.status)),this.filters.type!=="all"&&(a=a.filter(t=>t.type===this.filters.type)),this.filters.category!=="all"&&(a=a.filter(t=>t.category===this.filters.category)),this.filters.patient!=="all"&&(a=a.filter(t=>t.patientId===parseInt(this.filters.patient))),a}getScoreLevel(s){return s>=80?"excellent":s>=60?"good":s>=40?"fair":"poor"}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,a,t,e,i,n,l,o]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.evaluations||"/api/advanced-evaluations/evaluations"),this.apiClient.get(this.API_ENDPOINTS.templates||"/api/advanced-evaluations/templates"),this.apiClient.get(this.API_ENDPOINTS.questions||"/api/advanced-evaluations/questions"),this.apiClient.get(this.API_ENDPOINTS.responses||"/api/advanced-evaluations/responses"),this.apiClient.get(this.API_ENDPOINTS.scores||"/api/advanced-evaluations/scores"),this.apiClient.get(this.API_ENDPOINTS.reports||"/api/advanced-evaluations/reports"),this.apiClient.get(this.API_ENDPOINTS.comparisons||"/api/advanced-evaluations/comparisons"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-evaluations/analytics")]);this.evaluations=s.data||[],this.templates=a.data||[],this.questions=t.data||[],this.responses=e.data||[],this.scores=i.data||[],this.reports=n.data||[],this.comparisons=l.data||[],this.analytics=o.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading evaluations data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-evaluations","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,a){this.filters[s]=a.target.value,this.updateContent()}handleSearch(s){this.updateContent()}updateContent(){const s=document.getElementById("evaluationsContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{draft:"مسودة","in-progress":"قيد التنفيذ",completed:"مكتمل",reviewed:"تمت المراجعة"}[s]||s}getTypeText(s){return{initial:"ابتدائي",progress:"تقدم",final:"نهائي",periodic:"دوري"}[s]||s}getCategoryText(s){return{cognitive:"إدراكي",behavioral:"سلوكي",motor:"حركي",communication:"تواصل",social:"اجتماعي"}[s]||s}getQuestionTypeText(s){return{multiple:"اختيار متعدد",single:"اختيار واحد",text:"نص",scale:"مقياس",yesno:"نعم/لا"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedEvaluations",JSON.stringify(this.evaluations)),localStorage.setItem("advancedTemplates",JSON.stringify(this.templates)),localStorage.setItem("advancedQuestions",JSON.stringify(this.questions)),localStorage.setItem("advancedResponses",JSON.stringify(this.responses)),localStorage.setItem("advancedScores",JSON.stringify(this.scores)),localStorage.setItem("advancedReports",JSON.stringify(this.reports)),localStorage.setItem("advancedComparisons",JSON.stringify(this.comparisons)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.evaluations=JSON.parse(localStorage.getItem("advancedEvaluations")||"[]"),this.templates=JSON.parse(localStorage.getItem("advancedTemplates")||"[]"),this.questions=JSON.parse(localStorage.getItem("advancedQuestions")||"[]"),this.responses=JSON.parse(localStorage.getItem("advancedResponses")||"[]"),this.scores=JSON.parse(localStorage.getItem("advancedScores")||"[]"),this.reports=JSON.parse(localStorage.getItem("advancedReports")||"[]"),this.comparisons=JSON.parse(localStorage.getItem("advancedComparisons")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createEvaluation=this.createEvaluation.bind(this),this.createTemplate=this.createTemplate.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewEvaluation=this.viewEvaluation.bind(this),this.startEvaluation=this.startEvaluation.bind(this),this.completeEvaluation=this.completeEvaluation.bind(this),this.editEvaluation=this.editEvaluation.bind(this),this.useTemplate=this.useTemplate.bind(this),this.editTemplate=this.editTemplate.bind(this),this.editQuestion=this.editQuestion.bind(this),this.viewReport=this.viewReport.bind(this),this.downloadReport=this.downloadReport.bind(this)}async createEvaluation(){console.log("Create evaluation")}async createTemplate(){console.log("Create template")}async viewEvaluation(s){console.log("View evaluation",s)}async startEvaluation(s){console.log("Start evaluation",s)}async completeEvaluation(s){console.log("Complete evaluation",s)}async editEvaluation(s){console.log("Edit evaluation",s)}async useTemplate(s){console.log("Use template",s)}async editTemplate(s){console.log("Edit template",s)}async editQuestion(s){console.log("Edit question",s)}async viewReport(s){console.log("View report",s)}async downloadReport(s){console.log("Download report",s)}}export{g as default};
//# sourceMappingURL=rehabilitation-center-advanced-evaluations-C_ArgztC.js.map
