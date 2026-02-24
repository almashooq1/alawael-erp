const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var f=(l,s)=>()=>(s||l((s={exports:{}}).exports,s),s.exports);import{_ as c}from"./main-DFR0ngT_.js";var w=f(($,u)=>{let n=null,i=null,d=null,m=null,y=null,r=null;async function g(){if(n===null)try{n=(await c(()=>import("./main-DFR0ngT_.js").then(e=>e.f),__vite__mapDeps([0,1]))).default,i=(await c(()=>import("./main-DFR0ngT_.js").then(e=>e.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{m=(await c(()=>import("./main-DFR0ngT_.js").then(t=>t.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{d=(await c(()=>import("./main-DFR0ngT_.js").then(t=>t.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{y=(await c(()=>import("./main-DFR0ngT_.js").then(t=>t.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{r=(await c(()=>import("./main-DFR0ngT_.js").then(t=>t.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),n=null,i=null}}class v{constructor(){this.assessments=[],this.questions=[],this.results=[],this.templates=[],this.selectedAssessment=null,this.currentView="assessments",this.filterType="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await g(),this.useAPI=n!==null,this.useAPI?(await this.loadAssessments(),await this.loadQuestions(),await this.loadResults(),await this.loadTemplates()):this.initializeDefaultData(),d&&this.setupRealtimeSync(),m&&this.setupConnectionMonitoring(),this.renderAdvancedAssessments()}setupRealtimeSync(){d.subscribe("assessments:updated",s=>{this.loadAssessments()}),d.subscribe("assessments:result:updated",s=>{this.loadResults()})}setupConnectionMonitoring(){m.onStatusChange(s=>{s&&this.useAPI&&this.syncPendingChanges()})}async loadAssessments(){var s,e,t;this.loading=!0;try{if(this.useAPI&&n){const a="advanced_assessments",o=r?r.get(a):null;if(o)this.assessments=o;else{const h=await n.get(((e=(s=i==null?void 0:i.advancedAssessments)==null?void 0:s.assessments)==null?void 0:e.list)||"/api/advanced-assessments/assessments");(t=h.data)!=null&&t.success&&(this.assessments=h.data.data||[],r&&r.set(a,this.assessments,{ttl:5*60*1e3,tags:["assessments"]}))}}}catch(a){console.error("Error loading assessments:",a),this.loadAssessmentsFromStorage()}finally{this.loading=!1,this.renderAdvancedAssessments()}}async loadQuestions(){var s,e,t;try{if(this.useAPI&&n){const a=await n.get(((e=(s=i==null?void 0:i.advancedAssessments)==null?void 0:s.questions)==null?void 0:e.list)||"/api/advanced-assessments/questions");(t=a.data)!=null&&t.success&&(this.questions=a.data.data||[])}}catch(a){console.error("Error loading questions:",a),this.loadQuestionsFromStorage()}}async loadResults(){var s,e,t;try{if(this.useAPI&&n){const a=await n.get(((e=(s=i==null?void 0:i.advancedAssessments)==null?void 0:s.results)==null?void 0:e.list)||"/api/advanced-assessments/results");(t=a.data)!=null&&t.success&&(this.results=a.data.data||[])}}catch(a){console.error("Error loading results:",a),this.loadResultsFromStorage()}}async loadTemplates(){var s,e,t;try{if(this.useAPI&&n){const a=await n.get(((e=(s=i==null?void 0:i.advancedAssessments)==null?void 0:s.templates)==null?void 0:e.list)||"/api/advanced-assessments/templates");(t=a.data)!=null&&t.success&&(this.templates=a.data.data||[])}}catch(a){console.error("Error loading templates:",a),this.loadTemplatesFromStorage()}}loadAssessmentsFromStorage(){const s=localStorage.getItem("advanced_assessments");if(s)try{this.assessments=JSON.parse(s)}catch(e){console.error("Error loading assessments from storage:",e)}}loadQuestionsFromStorage(){const s=localStorage.getItem("advanced_questions");if(s)try{this.questions=JSON.parse(s)}catch(e){console.error("Error loading questions from storage:",e)}}loadResultsFromStorage(){const s=localStorage.getItem("advanced_results");if(s)try{this.results=JSON.parse(s)}catch(e){console.error("Error loading results from storage:",e)}}loadTemplatesFromStorage(){const s=localStorage.getItem("advanced_templates");if(s)try{this.templates=JSON.parse(s)}catch(e){console.error("Error loading templates from storage:",e)}}saveAssessmentsToStorage(){localStorage.setItem("advanced_assessments",JSON.stringify(this.assessments))}initializeDefaultData(){this.assessments.length===0&&(this.assessments=[{id:1,title:"تقييم المهارات الحركية",type:"motor",description:"تقييم شامل للمهارات الحركية",questionsCount:20,duration:30,passingScore:70,status:"active",createdAt:new Date().toISOString()}],this.saveAssessmentsToStorage())}async syncPendingChanges(){this.useAPI}async createAssessment(s){var e,t,a;this.loading=!0;try{if(this.useAPI&&n)(a=(await n.post(((t=(e=i==null?void 0:i.advancedAssessments)==null?void 0:e.assessments)==null?void 0:t.create)||"/api/advanced-assessments/assessments",s)).data)!=null&&a.success&&(r&&r.clear(["assessments"]),await this.loadAssessments(),typeof showToast=="function"&&showToast("تم إنشاء التقييم بنجاح","success"));else{const o={id:Date.now(),...s,status:"active",questionsCount:0,createdAt:new Date().toISOString()};this.assessments.push(o),this.saveAssessmentsToStorage(),this.renderAdvancedAssessments(),typeof showToast=="function"&&showToast("تم إنشاء التقييم بنجاح","success")}}catch(o){console.error("Error creating assessment:",o),typeof showToast=="function"&&showToast("فشل إنشاء التقييم","error")}finally{this.loading=!1}}filterByType(s){this.filterType=s,this.renderAdvancedAssessments()}searchAssessments(s){this.searchQuery=s,this.renderAdvancedAssessments()}getFilteredAssessments(){let s=this.assessments;if(this.filterType!=="all"&&(s=s.filter(e=>e.type===this.filterType)),this.searchQuery){const e=this.searchQuery.toLowerCase();s=s.filter(t=>t.title.toLowerCase().includes(e)||t.description&&t.description.toLowerCase().includes(e))}return s}renderAdvancedAssessments(){const s=document.getElementById("advanced-assessments-container")||document.body;s.innerHTML=`
      <div class="advanced-assessments">
        <div class="header-section">
          <h2><i class="fas fa-clipboard-check"></i> نظام إدارة التقييمات المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedAssessments.showCreateModal()">
              <i class="fas fa-plus"></i> تقييم جديد
            </button>
            <button class="btn btn-info" onclick="advancedAssessments.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="filters-section">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="search-input" placeholder="بحث في التقييمات..." 
                   value="${this.searchQuery}"
                   oninput="advancedAssessments.searchAssessments(this.value)">
          </div>
          <div class="type-filters">
            <button class="filter-btn ${this.filterType==="all"?"active":""}" 
                    onclick="advancedAssessments.filterByType('all')">
              الكل
            </button>
            <button class="filter-btn ${this.filterType==="motor"?"active":""}" 
                    onclick="advancedAssessments.filterByType('motor')">
              <i class="fas fa-running"></i> حركي
            </button>
            <button class="filter-btn ${this.filterType==="cognitive"?"active":""}" 
                    onclick="advancedAssessments.filterByType('cognitive')">
              <i class="fas fa-brain"></i> إدراكي
            </button>
            <button class="filter-btn ${this.filterType==="social"?"active":""}" 
                    onclick="advancedAssessments.filterByType('social')">
              <i class="fas fa-users"></i> اجتماعي
            </button>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="assessments"?"active":""}" onclick="advancedAssessments.switchView('assessments')">
            <i class="fas fa-clipboard-list"></i> التقييمات
          </button>
          <button class="tab-btn ${this.currentView==="questions"?"active":""}" onclick="advancedAssessments.switchView('questions')">
            <i class="fas fa-question-circle"></i> الأسئلة
          </button>
          <button class="tab-btn ${this.currentView==="results"?"active":""}" onclick="advancedAssessments.switchView('results')">
            <i class="fas fa-chart-bar"></i> النتائج
          </button>
          <button class="tab-btn ${this.currentView==="templates"?"active":""}" onclick="advancedAssessments.switchView('templates')">
            <i class="fas fa-layer-group"></i> القوالب
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"assessments":return this.renderAssessmentsList();case"questions":return this.renderQuestions();case"results":return this.renderResults();case"templates":return this.renderTemplates();default:return this.renderAssessmentsList()}}renderAssessmentsList(){return`
      <div class="assessments-view">
        <div class="assessments-grid">
          ${this.getFilteredAssessments().map(e=>`
            <div class="assessment-card">
              <div class="assessment-header">
                <h4>${e.title}</h4>
                <span class="assessment-type type-${e.type}">
                  ${this.getTypeName(e.type)}
                </span>
              </div>
              <div class="assessment-body">
                <p>${e.description||""}</p>
                <div class="assessment-stats">
                  <div class="stat-item">
                    <i class="fas fa-question"></i>
                    <span>${e.questionsCount||0} سؤال</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span>${e.duration||0} دقيقة</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-percentage"></i>
                    <span>${e.passingScore||0}% للنجاح</span>
                  </div>
                </div>
              </div>
              <div class="assessment-footer">
                <div class="assessment-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedAssessments.viewAssessment(${e.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedAssessments.editAssessment(${e.id})">
                    <i class="fas fa-edit"></i> تعديل
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="advancedAssessments.deleteAssessment(${e.id})">
                    <i class="fas fa-trash"></i> حذف
                  </button>
                </div>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد تقييمات</p>'}
        </div>
      </div>
    `}renderQuestions(){return`
      <div class="questions-view">
        <div class="questions-list">
          ${this.questions.map(s=>`
            <div class="question-card">
              <div class="question-header">
                <h4>${s.text}</h4>
                <span class="question-type">${this.getQuestionTypeName(s.type)}</span>
              </div>
              <div class="question-body">
                ${s.options&&s.options.length>0?`
                  <div class="question-options">
                    ${s.options.map((e,t)=>`
                      <div class="option-item">
                        <span class="option-label">${String.fromCharCode(65+t)}</span>
                        <span>${e}</span>
                      </div>
                    `).join("")}
                  </div>
                `:""}
                <div class="question-meta">
                  <span><i class="fas fa-tag"></i> ${s.category||"غير محدد"}</span>
                  <span><i class="fas fa-star"></i> ${s.points||1} نقطة</span>
                </div>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد أسئلة</p>'}
        </div>
      </div>
    `}renderResults(){return`
      <div class="results-view">
        <div class="results-list">
          ${this.results.map(s=>{const e=this.assessments.find(t=>t.id===s.assessmentId);return`
              <div class="result-card">
                <div class="result-header">
                  <h4>${(e==null?void 0:e.title)||"تقييم غير محدد"}</h4>
                  <span class="result-score score-${this.getScoreCategory(s.score)}">
                    ${s.score}%
                  </span>
                </div>
                <div class="result-body">
                  <div class="result-details">
                    <div class="detail-item">
                      <span>المشارك:</span>
                      <span>${s.participantName||"غير محدد"}</span>
                    </div>
                    <div class="detail-item">
                      <span>تاريخ التقييم:</span>
                      <span>${new Date(s.completedAt).toLocaleString("ar-SA")}</span>
                    </div>
                    <div class="detail-item">
                      <span>المدة:</span>
                      <span>${s.duration||0} دقيقة</span>
                    </div>
                    <div class="detail-item">
                      <span>الحالة:</span>
                      <span class="result-status status-${s.passed?"passed":"failed"}">
                        ${s.passed?"نجح":"فشل"}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="result-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedAssessments.viewResult(${s.id})">
                    <i class="fas fa-eye"></i> عرض التفاصيل
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedAssessments.downloadResult(${s.id})">
                    <i class="fas fa-download"></i> تحميل
                  </button>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا توجد نتائج</p>'}
        </div>
      </div>
    `}renderTemplates(){return`
      <div class="templates-view">
        <div class="templates-grid">
          ${this.templates.map(s=>`
            <div class="template-card">
              <div class="template-header">
                <h4>${s.name}</h4>
                <span class="template-type">${this.getTypeName(s.type)}</span>
              </div>
              <div class="template-body">
                <p>${s.description||""}</p>
                <div class="template-info">
                  <span><i class="fas fa-question"></i> ${s.questionsCount||0} سؤال</span>
                  <span><i class="fas fa-clock"></i> ${s.duration||0} دقيقة</span>
                </div>
              </div>
              <div class="template-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedAssessments.useTemplate(${s.id})">
                  <i class="fas fa-plus"></i> استخدام
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد قوالب</p>'}
        </div>
      </div>
    `}getTypeName(s){return{motor:"حركي",cognitive:"إدراكي",social:"اجتماعي",communication:"تواصلي",behavioral:"سلوكي"}[s]||s}getQuestionTypeName(s){return{multiple_choice:"اختيار متعدد",true_false:"صح/خطأ",short_answer:"إجابة قصيرة",essay:"مقال"}[s]||s}getScoreCategory(s){return s>=90?"excellent":s>=70?"good":s>=50?"average":"poor"}switchView(s){this.currentView=s,this.renderAdvancedAssessments()}viewAssessment(s){alert(`عرض التقييم #${s} - سيتم التطوير قريباً`)}editAssessment(s){alert(`تعديل التقييم #${s} - سيتم التطوير قريباً`)}async deleteAssessment(s){var e,t,a;if(confirm("هل أنت متأكد من حذف هذا التقييم؟"))try{this.useAPI&&n?(a=(await n.delete(((t=(e=i==null?void 0:i.advancedAssessments)==null?void 0:e.assessments)==null?void 0:t.delete)||`/api/advanced-assessments/assessments/${s}`)).data)!=null&&a.success&&(r&&r.clear(["assessments"]),await this.loadAssessments(),typeof showToast=="function"&&showToast("تم حذف التقييم","success")):(this.assessments=this.assessments.filter(o=>o.id!==s),this.saveAssessmentsToStorage(),this.renderAdvancedAssessments())}catch(o){console.error("Error deleting assessment:",o),typeof showToast=="function"&&showToast("فشل حذف التقييم","error")}}viewResult(s){alert(`عرض النتيجة #${s} - سيتم التطوير قريباً`)}downloadResult(s){alert(`تحميل النتيجة #${s} - سيتم التطوير قريباً`)}useTemplate(s){alert(`استخدام القالب #${s} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء تقييم - سيتم التطوير قريباً")}async refresh(){r&&r.clear(["assessments"]),await this.loadAssessments(),await this.loadQuestions(),await this.loadResults(),await this.loadTemplates(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const p=new v;typeof window<"u"&&(window.advancedAssessments=p,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(p,"advancedAssessments"));typeof u<"u"&&u.exports&&(u.exports=v)});export default w();
//# sourceMappingURL=rehabilitation-center-advanced-assessments-CVopFKoY.js.map
