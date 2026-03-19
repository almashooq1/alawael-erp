const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var y=(d,i)=>()=>(i||d((i={exports:{}}).exports,i),i.exports);import{_ as o}from"./main-DFR0ngT_.js";var m=y(($,l)=>{let n=null,s=null,f=null,v=null,g=null,c=null;async function b(){if(n===null)try{n=(await o(()=>import("./main-DFR0ngT_.js").then(a=>a.f),__vite__mapDeps([0,1]))).default,s=(await o(()=>import("./main-DFR0ngT_.js").then(a=>a.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{v=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{f=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{g=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{c=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),n=null,s=null}}class p{constructor(){this.certifications=[],this.standards=[],this.verifications=[],this.selectedCertification=null,this.currentView="certifications",this.filterType="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await b(),this.useAPI=n!==null,this.useAPI?(await this.loadCertifications(),await this.loadStandards(),await this.loadVerifications()):this.initializeDefaultData(),f&&this.setupRealtimeSync(),v&&this.setupConnectionMonitoring(),this.renderAdvancedCertifications()}setupRealtimeSync(){f.subscribe("certifications:updated",i=>{this.loadCertifications()})}setupConnectionMonitoring(){v.onStatusChange(i=>{i&&this.useAPI&&this.syncPendingChanges()})}async loadCertifications(){var i,a,t;this.loading=!0;try{if(this.useAPI&&n){const e="advanced_certifications",r=c?c.get(e):null;if(r)this.certifications=r;else{const h=await n.get(((a=(i=s==null?void 0:s.advancedCertifications)==null?void 0:i.certifications)==null?void 0:a.list)||"/api/advanced-certifications/certifications");(t=h.data)!=null&&t.success&&(this.certifications=h.data.data||[],c&&c.set(e,this.certifications,{ttl:5*60*1e3,tags:["certifications"]}))}}}catch(e){console.error("Error loading certifications:",e),this.loadCertificationsFromStorage()}finally{this.loading=!1,this.renderAdvancedCertifications()}}async loadStandards(){var i,a,t;try{if(this.useAPI&&n){const e=await n.get(((a=(i=s==null?void 0:s.advancedCertifications)==null?void 0:i.standards)==null?void 0:a.list)||"/api/advanced-certifications/standards");(t=e.data)!=null&&t.success&&(this.standards=e.data.data||[])}}catch(e){console.error("Error loading standards:",e),this.loadStandardsFromStorage()}}async loadVerifications(){var i,a,t;try{if(this.useAPI&&n){const e=await n.get(((a=(i=s==null?void 0:s.advancedCertifications)==null?void 0:i.verifications)==null?void 0:a.list)||"/api/advanced-certifications/verifications");(t=e.data)!=null&&t.success&&(this.verifications=e.data.data||[])}}catch(e){console.error("Error loading verifications:",e),this.loadVerificationsFromStorage()}}loadCertificationsFromStorage(){const i=localStorage.getItem("advanced_certifications");if(i)try{this.certifications=JSON.parse(i)}catch(a){console.error("Error loading certifications from storage:",a)}}loadStandardsFromStorage(){const i=localStorage.getItem("advanced_certifications_standards");if(i)try{this.standards=JSON.parse(i)}catch(a){console.error("Error loading standards from storage:",a)}}loadVerificationsFromStorage(){const i=localStorage.getItem("advanced_certifications_verifications");if(i)try{this.verifications=JSON.parse(i)}catch(a){console.error("Error loading verifications from storage:",a)}}saveCertificationsToStorage(){localStorage.setItem("advanced_certifications",JSON.stringify(this.certifications))}initializeDefaultData(){this.certifications.length===0&&(this.certifications=[{id:1,name:"شهادة ISO 9001",type:"quality",issuer:"منظمة المعايير الدولية",issueDate:new Date().toISOString(),expiryDate:new Date(Date.now()+365*24*60*60*1e3).toISOString(),status:"active"}],this.saveCertificationsToStorage())}async syncPendingChanges(){this.useAPI}filterByType(i){this.filterType=i===this.filterType?"all":i,this.renderAdvancedCertifications()}searchCertifications(i){this.searchQuery=i,this.renderAdvancedCertifications()}getFilteredCertifications(){let i=this.certifications;if(this.filterType!=="all"&&(i=i.filter(a=>a.type===this.filterType)),this.searchQuery){const a=this.searchQuery.toLowerCase();i=i.filter(t=>t.name.toLowerCase().includes(a)||t.issuer&&t.issuer.toLowerCase().includes(a))}return i}renderAdvancedCertifications(){const i=document.getElementById("advanced-certifications-container")||document.body;i.innerHTML=`
      <div class="advanced-certifications">
        <div class="header-section">
          <h2><i class="fas fa-certificate"></i> نظام إدارة الشهادات المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedCertifications.showCreateModal()">
              <i class="fas fa-plus"></i> شهادة جديدة
            </button>
            <button class="btn btn-info" onclick="advancedCertifications.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="filters-section">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="search-input" placeholder="بحث في الشهادات..." 
                   value="${this.searchQuery}"
                   oninput="advancedCertifications.searchCertifications(this.value)">
          </div>
          <div class="type-filters">
            <button class="filter-btn ${this.filterType==="all"?"active":""}" 
                    onclick="advancedCertifications.filterByType('all')">
              الكل
            </button>
            <button class="filter-btn ${this.filterType==="quality"?"active":""}" 
                    onclick="advancedCertifications.filterByType('quality')">
              <i class="fas fa-star"></i> الجودة
            </button>
            <button class="filter-btn ${this.filterType==="safety"?"active":""}" 
                    onclick="advancedCertifications.filterByType('safety')">
              <i class="fas fa-shield-alt"></i> السلامة
            </button>
            <button class="filter-btn ${this.filterType==="medical"?"active":""}" 
                    onclick="advancedCertifications.filterByType('medical')">
              <i class="fas fa-heartbeat"></i> طبي
            </button>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="certifications"?"active":""}" onclick="advancedCertifications.switchView('certifications')">
            <i class="fas fa-certificate"></i> الشهادات
          </button>
          <button class="tab-btn ${this.currentView==="standards"?"active":""}" onclick="advancedCertifications.switchView('standards')">
            <i class="fas fa-clipboard-check"></i> المعايير
          </button>
          <button class="tab-btn ${this.currentView==="verifications"?"active":""}" onclick="advancedCertifications.switchView('verifications')">
            <i class="fas fa-check-double"></i> التحقق
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"certifications":return this.renderCertifications();case"standards":return this.renderStandards();case"verifications":return this.renderVerifications();default:return this.renderCertifications()}}renderCertifications(){const i=this.getFilteredCertifications(),a={total:this.certifications.length,active:this.certifications.filter(t=>t.status==="active").length,expired:this.certifications.filter(t=>t.status==="expired").length,pending:this.certifications.filter(t=>t.status==="pending").length};return`
      <div class="certifications-view">
        <div class="certifications-stats">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <i class="fas fa-certificate"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي الشهادات</h3>
              <p class="count">${a.total}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3>نشط</h3>
              <p class="count">${a.active}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
              <i class="fas fa-times-circle"></i>
            </div>
            <div class="stat-content">
              <h3>منتهي</h3>
              <p class="count">${a.expired}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <h3>قيد المراجعة</h3>
              <p class="count">${a.pending}</p>
            </div>
          </div>
        </div>

        <div class="certifications-grid">
          ${i.map(t=>{const e=t.expiryDate&&new Date(t.expiryDate)<new Date(Date.now()+7776e6);return`
              <div class="certification-card ${e?"expiring-soon":""}">
                <div class="certification-header">
                  <h4>${t.name}</h4>
                  <span class="certification-status status-${t.status}">
                    ${this.getStatusName(t.status)}
                  </span>
                </div>
                <div class="certification-body">
                  <div class="certification-info">
                    <div class="info-item">
                      <i class="fas fa-building"></i>
                      <span>${t.issuer||"غير محدد"}</span>
                    </div>
                    <div class="info-item">
                      <i class="fas fa-tag"></i>
                      <span>${this.getTypeName(t.type)}</span>
                    </div>
                    <div class="info-item">
                      <i class="fas fa-calendar-check"></i>
                      <span>تاريخ الإصدار: ${new Date(t.issueDate).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <div class="info-item">
                      <i class="fas fa-calendar-times"></i>
                      <span>تاريخ الانتهاء: ${t.expiryDate?new Date(t.expiryDate).toLocaleDateString("ar-SA"):"غير محدد"}</span>
                    </div>
                  </div>
                  ${e?`
                    <div class="expiry-warning">
                      <i class="fas fa-exclamation-triangle"></i>
                      <span>تنتهي قريباً</span>
                    </div>
                  `:""}
                </div>
                <div class="certification-footer">
                  <div class="certification-actions">
                    <button class="btn btn-sm btn-primary" onclick="advancedCertifications.viewCertification(${t.id})">
                      <i class="fas fa-eye"></i> عرض
                    </button>
                    <button class="btn btn-sm btn-success" onclick="advancedCertifications.editCertification(${t.id})">
                      <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="advancedCertifications.deleteCertification(${t.id})">
                      <i class="fas fa-trash"></i> حذف
                    </button>
                  </div>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا توجد شهادات</p>'}
        </div>
      </div>
    `}renderStandards(){return`
      <div class="standards-view">
        <div class="standards-list">
          ${this.standards.map(i=>`
            <div class="standard-card">
              <div class="standard-header">
                <h4>${i.name}</h4>
                <span class="standard-code">${i.code||"غير محدد"}</span>
              </div>
              <div class="standard-body">
                <p>${i.description||""}</p>
                <div class="standard-info">
                  <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>تاريخ الإصدار: ${new Date(i.releaseDate).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-check-circle"></i>
                    <span>الحالة: ${i.status||"غير محدد"}</span>
                  </div>
                </div>
              </div>
              <div class="standard-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedCertifications.viewStandard(${i.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد معايير</p>'}
        </div>
      </div>
    `}renderVerifications(){return`
      <div class="verifications-view">
        <div class="verifications-list">
          ${this.verifications.map(i=>`
            <div class="verification-card verification-${i.status}">
              <div class="verification-header">
                <h4>${i.certificationName||"شهادة غير محدد"}</h4>
                <span class="verification-status status-${i.status}">
                  ${this.getVerificationStatusName(i.status)}
                </span>
              </div>
              <div class="verification-body">
                <div class="verification-details">
                  <div class="detail-item">
                    <span>تاريخ التحقق:</span>
                    <span>${new Date(i.verificationDate).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <div class="detail-item">
                    <span>المتحقق:</span>
                    <span>${i.verifierName||"غير محدد"}</span>
                  </div>
                  <div class="detail-item">
                    <span>النتيجة:</span>
                    <span>${i.result||"غير محدد"}</span>
                  </div>
                </div>
              </div>
              <div class="verification-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedCertifications.viewVerification(${i.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد تحققات</p>'}
        </div>
      </div>
    `}getStatusName(i){return{active:"نشط",expired:"منتهي",pending:"قيد المراجعة",revoked:"ملغي"}[i]||i}getTypeName(i){return{quality:"جودة",safety:"سلامة",medical:"طبي",environmental:"بيئي"}[i]||i}getVerificationStatusName(i){return{verified:"متحقق",pending:"قيد المراجعة",failed:"فشل",expired:"منتهي"}[i]||i}switchView(i){this.currentView=i,this.renderAdvancedCertifications()}viewCertification(i){alert(`عرض الشهادة #${i} - سيتم التطوير قريباً`)}editCertification(i){alert(`تعديل الشهادة #${i} - سيتم التطوير قريباً`)}async deleteCertification(i){var a,t,e;if(confirm("هل أنت متأكد من حذف هذه الشهادة؟"))try{this.useAPI&&n?(e=(await n.delete(((t=(a=s==null?void 0:s.advancedCertifications)==null?void 0:a.certifications)==null?void 0:t.delete)||`/api/advanced-certifications/certifications/${i}`)).data)!=null&&e.success&&(c&&c.clear(["certifications"]),await this.loadCertifications(),typeof showToast=="function"&&showToast("تم حذف الشهادة","success")):(this.certifications=this.certifications.filter(r=>r.id!==i),this.saveCertificationsToStorage(),this.renderAdvancedCertifications())}catch(r){console.error("Error deleting certification:",r),typeof showToast=="function"&&showToast("فشل حذف الشهادة","error")}}viewStandard(i){alert(`عرض المعيار #${i} - سيتم التطوير قريباً`)}viewVerification(i){alert(`عرض التحقق #${i} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء شهادة - سيتم التطوير قريباً")}async refresh(){c&&c.clear(["certifications"]),await this.loadCertifications(),await this.loadStandards(),await this.loadVerifications(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const u=new p;typeof window<"u"&&(window.advancedCertifications=u,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(u,"advancedCertifications"));typeof l<"u"&&l.exports&&(l.exports=p)});export default m();
//# sourceMappingURL=rehabilitation-center-advanced-certifications-DHAYiYC6.js.map
