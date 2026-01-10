const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var g=(l,e)=>()=>(e||l((e={exports:{}}).exports,e),e.exports);import{_ as c}from"./main-DFR0ngT_.js";var b=g(($,d)=>{let r=null,i=null,p=null,h=null,m=null,o=null;async function y(){if(r===null)try{r=(await c(()=>import("./main-DFR0ngT_.js").then(t=>t.f),__vite__mapDeps([0,1]))).default,i=(await c(()=>import("./main-DFR0ngT_.js").then(t=>t.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{h=(await c(()=>import("./main-DFR0ngT_.js").then(s=>s.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{p=(await c(()=>import("./main-DFR0ngT_.js").then(s=>s.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{m=(await c(()=>import("./main-DFR0ngT_.js").then(s=>s.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{o=(await c(()=>import("./main-DFR0ngT_.js").then(s=>s.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),r=null,i=null}}class v{constructor(){this.reports=[],this.templates=[],this.schedules=[],this.selectedReport=null,this.currentView="reports",this.filterCategory="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await y(),this.useAPI=r!==null,this.useAPI?(await this.loadReports(),await this.loadTemplates(),await this.loadSchedules()):this.initializeDefaultData(),p&&this.setupRealtimeSync(),h&&this.setupConnectionMonitoring(),this.renderAdvancedReports()}setupRealtimeSync(){p.subscribe("reports:updated",e=>{this.loadReports()})}setupConnectionMonitoring(){h.onStatusChange(e=>{e&&this.useAPI&&this.syncPendingChanges()})}async loadReports(){var e,t,s;this.loading=!0;try{if(this.useAPI&&r){const a="advanced_reports",n=o?o.get(a):null;if(n)this.reports=n;else{const u=await r.get(((t=(e=i==null?void 0:i.advancedReports)==null?void 0:e.reports)==null?void 0:t.list)||"/api/advanced-reports/reports");(s=u.data)!=null&&s.success&&(this.reports=u.data.data||[],o&&o.set(a,this.reports,{ttl:5*60*1e3,tags:["reports"]}))}}}catch(a){console.error("Error loading reports:",a),this.loadReportsFromStorage()}finally{this.loading=!1,this.renderAdvancedReports()}}async loadTemplates(){var e,t,s;try{if(this.useAPI&&r){const a=await r.get(((t=(e=i==null?void 0:i.advancedReports)==null?void 0:e.templates)==null?void 0:t.list)||"/api/advanced-reports/templates");(s=a.data)!=null&&s.success&&(this.templates=a.data.data||[])}}catch(a){console.error("Error loading templates:",a),this.loadTemplatesFromStorage()}}async loadSchedules(){var e,t,s;try{if(this.useAPI&&r){const a=await r.get(((t=(e=i==null?void 0:i.advancedReports)==null?void 0:e.schedules)==null?void 0:t.list)||"/api/advanced-reports/schedules");(s=a.data)!=null&&s.success&&(this.schedules=a.data.data||[])}}catch(a){console.error("Error loading schedules:",a),this.loadSchedulesFromStorage()}}loadReportsFromStorage(){const e=localStorage.getItem("advanced_reports");if(e)try{this.reports=JSON.parse(e)}catch(t){console.error("Error loading reports from storage:",t)}}loadTemplatesFromStorage(){const e=localStorage.getItem("advanced_reports_templates");if(e)try{this.templates=JSON.parse(e)}catch(t){console.error("Error loading templates from storage:",t)}}loadSchedulesFromStorage(){const e=localStorage.getItem("advanced_reports_schedules");if(e)try{this.schedules=JSON.parse(e)}catch(t){console.error("Error loading schedules from storage:",t)}}saveReportsToStorage(){localStorage.setItem("advanced_reports",JSON.stringify(this.reports))}initializeDefaultData(){this.reports.length===0&&(this.reports=[{id:1,title:"تقرير الأداء الشهري",category:"performance",status:"completed",generatedAt:new Date().toISOString(),format:"pdf"}],this.saveReportsToStorage())}async syncPendingChanges(){this.useAPI}filterByCategory(e){this.filterCategory=e===this.filterCategory?"all":e,this.renderAdvancedReports()}searchReports(e){this.searchQuery=e,this.renderAdvancedReports()}getFilteredReports(){let e=this.reports;if(this.filterCategory!=="all"&&(e=e.filter(t=>t.category===this.filterCategory)),this.searchQuery){const t=this.searchQuery.toLowerCase();e=e.filter(s=>s.title.toLowerCase().includes(t)||s.description&&s.description.toLowerCase().includes(t))}return e}renderAdvancedReports(){const e=document.getElementById("advanced-reports-container")||document.body;e.innerHTML=`
      <div class="advanced-reports">
        <div class="header-section">
          <h2><i class="fas fa-chart-bar"></i> نظام إدارة التقارير المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedReports.showCreateModal()">
              <i class="fas fa-plus"></i> تقرير جديد
            </button>
            <button class="btn btn-info" onclick="advancedReports.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="filters-section">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="search-input" placeholder="بحث في التقارير..." 
                   value="${this.searchQuery}"
                   oninput="advancedReports.searchReports(this.value)">
          </div>
          <div class="category-filters">
            <button class="filter-btn ${this.filterCategory==="all"?"active":""}" 
                    onclick="advancedReports.filterByCategory('all')">
              الكل
            </button>
            <button class="filter-btn ${this.filterCategory==="performance"?"active":""}" 
                    onclick="advancedReports.filterByCategory('performance')">
              <i class="fas fa-tachometer-alt"></i> الأداء
            </button>
            <button class="filter-btn ${this.filterCategory==="financial"?"active":""}" 
                    onclick="advancedReports.filterByCategory('financial')">
              <i class="fas fa-dollar-sign"></i> مالي
            </button>
            <button class="filter-btn ${this.filterCategory==="operational"?"active":""}" 
                    onclick="advancedReports.filterByCategory('operational')">
              <i class="fas fa-cogs"></i> تشغيلي
            </button>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="reports"?"active":""}" onclick="advancedReports.switchView('reports')">
            <i class="fas fa-file-alt"></i> التقارير
          </button>
          <button class="tab-btn ${this.currentView==="templates"?"active":""}" onclick="advancedReports.switchView('templates')">
            <i class="fas fa-layer-group"></i> القوالب
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}" onclick="advancedReports.switchView('schedules')">
            <i class="fas fa-calendar-alt"></i> الجدولة
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"reports":return this.renderReports();case"templates":return this.renderTemplates();case"schedules":return this.renderSchedules();default:return this.renderReports()}}renderReports(){const e=this.getFilteredReports(),t={total:this.reports.length,completed:this.reports.filter(s=>s.status==="completed").length,pending:this.reports.filter(s=>s.status==="pending").length,failed:this.reports.filter(s=>s.status==="failed").length};return`
      <div class="reports-view">
        <div class="reports-stats">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <i class="fas fa-file-alt"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي التقارير</h3>
              <p class="count">${t.total}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3>مكتمل</h3>
              <p class="count">${t.completed}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <h3>قيد المعالجة</h3>
              <p class="count">${t.pending}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
              <i class="fas fa-times-circle"></i>
            </div>
            <div class="stat-content">
              <h3>فشل</h3>
              <p class="count">${t.failed}</p>
            </div>
          </div>
        </div>

        <div class="reports-list">
          ${e.map(s=>{var a;return`
            <div class="report-card">
              <div class="report-header">
                <h4>${s.title}</h4>
                <span class="report-status status-${s.status}">
                  ${this.getStatusName(s.status)}
                </span>
              </div>
              <div class="report-body">
                <div class="report-info">
                  <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <span>${this.getCategoryName(s.category)}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-file"></i>
                    <span>${((a=s.format)==null?void 0:a.toUpperCase())||"PDF"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(s.generatedAt).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
              </div>
              <div class="report-footer">
                <div class="report-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedReports.viewReport(${s.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedReports.downloadReport(${s.id})">
                    <i class="fas fa-download"></i> تحميل
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="advancedReports.deleteReport(${s.id})">
                    <i class="fas fa-trash"></i> حذف
                  </button>
                </div>
              </div>
            </div>
          `}).join("")||'<p class="empty-state">لا توجد تقارير</p>'}
        </div>
      </div>
    `}renderTemplates(){return`
      <div class="templates-view">
        <div class="templates-grid">
          ${this.templates.map(e=>`
            <div class="template-card">
              <div class="template-header">
                <h4>${e.name}</h4>
                <span class="template-category">${this.getCategoryName(e.category)}</span>
              </div>
              <div class="template-body">
                <p>${e.description||""}</p>
              </div>
              <div class="template-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedReports.useTemplate(${e.id})">
                  <i class="fas fa-plus"></i> استخدام
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد قوالب</p>'}
        </div>
      </div>
    `}renderSchedules(){return`
      <div class="schedules-view">
        <div class="schedules-list">
          ${this.schedules.map(e=>`
            <div class="schedule-card">
              <div class="schedule-header">
                <h4>${e.reportName||"تقرير مجدول"}</h4>
                <span class="schedule-frequency">${this.getFrequencyName(e.frequency)}</span>
              </div>
              <div class="schedule-body">
                <div class="schedule-info">
                  <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>آخر تشغيل: ${e.lastRun?new Date(e.lastRun).toLocaleDateString("ar-SA"):"لم يتم التشغيل"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-calendar-check"></i>
                    <span>التشغيل القادم: ${e.nextRun?new Date(e.nextRun).toLocaleDateString("ar-SA"):"غير محدد"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-toggle-${e.enabled?"on":"off"}"></i>
                    <span>${e.enabled?"مفعل":"معطل"}</span>
                  </div>
                </div>
              </div>
              <div class="schedule-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedReports.viewSchedule(${e.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedReports.editSchedule(${e.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد جداول</p>'}
        </div>
      </div>
    `}getStatusName(e){return{completed:"مكتمل",pending:"قيد المعالجة",failed:"فشل",cancelled:"ملغي"}[e]||e}getCategoryName(e){return{performance:"الأداء",financial:"مالي",operational:"تشغيلي",quality:"الجودة",compliance:"الامتثال"}[e]||e}getFrequencyName(e){return{daily:"يومي",weekly:"أسبوعي",monthly:"شهري",quarterly:"ربع سنوي",yearly:"سنوي"}[e]||e}switchView(e){this.currentView=e,this.renderAdvancedReports()}viewReport(e){alert(`عرض التقرير #${e} - سيتم التطوير قريباً`)}downloadReport(e){alert(`تحميل التقرير #${e} - سيتم التطوير قريباً`)}async deleteReport(e){var t,s,a;if(confirm("هل أنت متأكد من حذف هذا التقرير؟"))try{this.useAPI&&r?(a=(await r.delete(((s=(t=i==null?void 0:i.advancedReports)==null?void 0:t.reports)==null?void 0:s.delete)||`/api/advanced-reports/reports/${e}`)).data)!=null&&a.success&&(o&&o.clear(["reports"]),await this.loadReports(),typeof showToast=="function"&&showToast("تم حذف التقرير","success")):(this.reports=this.reports.filter(n=>n.id!==e),this.saveReportsToStorage(),this.renderAdvancedReports())}catch(n){console.error("Error deleting report:",n),typeof showToast=="function"&&showToast("فشل حذف التقرير","error")}}useTemplate(e){alert(`استخدام القالب #${e} - سيتم التطوير قريباً`)}viewSchedule(e){alert(`عرض الجدول #${e} - سيتم التطوير قريباً`)}editSchedule(e){alert(`تعديل الجدول #${e} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء تقرير - سيتم التطوير قريباً")}async refresh(){o&&o.clear(["reports"]),await this.loadReports(),await this.loadTemplates(),await this.loadSchedules(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const f=new v;typeof window<"u"&&(window.advancedReports=f,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(f,"advancedReports"));typeof d<"u"&&d.exports&&(d.exports=v)});export default b();
//# sourceMappingURL=rehabilitation-center-advanced-reports--odqURPh.js.map
