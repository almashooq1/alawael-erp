const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var g=(d,s)=>()=>(s||d((s={exports:{}}).exports,s),s.exports);import{_ as o}from"./main-DFR0ngT_.js";var w=g((C,u)=>{let n=null,e=null,l=null,v=null,b=null,r=null;async function m(){if(n===null)try{n=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.f),__vite__mapDeps([0,1]))).default,e=(await o(()=>import("./main-DFR0ngT_.js").then(t=>t.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{v=(await o(()=>import("./main-DFR0ngT_.js").then(a=>a.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{l=(await o(()=>import("./main-DFR0ngT_.js").then(a=>a.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{b=(await o(()=>import("./main-DFR0ngT_.js").then(a=>a.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{r=(await o(()=>import("./main-DFR0ngT_.js").then(a=>a.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),n=null,e=null}}class p{constructor(){this.courses=[],this.sessions=[],this.participants=[],this.certificates=[],this.instructors=[],this.selectedCourse=null,this.currentView="courses",this.filterStatus="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await m(),this.useAPI=n!==null,this.useAPI?(await this.loadCourses(),await this.loadSessions(),await this.loadParticipants(),await this.loadCertificates(),await this.loadInstructors()):this.initializeDefaultData(),l&&this.setupRealtimeSync(),v&&this.setupConnectionMonitoring(),this.renderAdvancedTraining()}setupRealtimeSync(){l.subscribe("training:course:updated",s=>{this.loadCourses()}),l.subscribe("training:session:updated",s=>{this.loadSessions()})}setupConnectionMonitoring(){v.onStatusChange(s=>{s&&this.useAPI&&this.syncPendingChanges()})}async loadCourses(){var s,t,a;this.loading=!0;try{if(this.useAPI&&n){const i="advanced_training_courses",c=r?r.get(i):null;if(c)this.courses=c;else{const h=await n.get(((t=(s=e==null?void 0:e.advancedTraining)==null?void 0:s.courses)==null?void 0:t.list)||"/api/advanced-training/courses");(a=h.data)!=null&&a.success&&(this.courses=h.data.data||[],r&&r.set(i,this.courses,{ttl:5*60*1e3,tags:["training"]}))}}}catch(i){console.error("Error loading courses:",i),this.loadCoursesFromStorage()}finally{this.loading=!1,this.renderAdvancedTraining()}}async loadSessions(){var s,t,a;try{if(this.useAPI&&n){const i=await n.get(((t=(s=e==null?void 0:e.advancedTraining)==null?void 0:s.sessions)==null?void 0:t.list)||"/api/advanced-training/sessions");(a=i.data)!=null&&a.success&&(this.sessions=i.data.data||[])}}catch(i){console.error("Error loading sessions:",i),this.loadSessionsFromStorage()}}async loadParticipants(){var s,t,a;try{if(this.useAPI&&n){const i=await n.get(((t=(s=e==null?void 0:e.advancedTraining)==null?void 0:s.participants)==null?void 0:t.list)||"/api/advanced-training/participants");(a=i.data)!=null&&a.success&&(this.participants=i.data.data||[])}}catch(i){console.error("Error loading participants:",i),this.loadParticipantsFromStorage()}}async loadCertificates(){var s,t,a;try{if(this.useAPI&&n){const i=await n.get(((t=(s=e==null?void 0:e.advancedTraining)==null?void 0:s.certificates)==null?void 0:t.list)||"/api/advanced-training/certificates");(a=i.data)!=null&&a.success&&(this.certificates=i.data.data||[])}}catch(i){console.error("Error loading certificates:",i),this.loadCertificatesFromStorage()}}async loadInstructors(){var s,t,a;try{if(this.useAPI&&n){const i=await n.get(((t=(s=e==null?void 0:e.advancedTraining)==null?void 0:s.instructors)==null?void 0:t.list)||"/api/advanced-training/instructors");(a=i.data)!=null&&a.success&&(this.instructors=i.data.data||[])}}catch(i){console.error("Error loading instructors:",i),this.loadInstructorsFromStorage()}}loadCoursesFromStorage(){const s=localStorage.getItem("advanced_training_courses");if(s)try{this.courses=JSON.parse(s)}catch(t){console.error("Error loading courses from storage:",t)}}loadSessionsFromStorage(){const s=localStorage.getItem("advanced_training_sessions");if(s)try{this.sessions=JSON.parse(s)}catch(t){console.error("Error loading sessions from storage:",t)}}loadParticipantsFromStorage(){const s=localStorage.getItem("advanced_training_participants");if(s)try{this.participants=JSON.parse(s)}catch(t){console.error("Error loading participants from storage:",t)}}loadCertificatesFromStorage(){const s=localStorage.getItem("advanced_training_certificates");if(s)try{this.certificates=JSON.parse(s)}catch(t){console.error("Error loading certificates from storage:",t)}}loadInstructorsFromStorage(){const s=localStorage.getItem("advanced_training_instructors");if(s)try{this.instructors=JSON.parse(s)}catch(t){console.error("Error loading instructors from storage:",t)}}saveCoursesToStorage(){localStorage.setItem("advanced_training_courses",JSON.stringify(this.courses))}initializeDefaultData(){this.courses.length===0&&(this.courses=[{id:1,title:"دورة العلاج الطبيعي المتقدم",description:"دورة شاملة في العلاج الطبيعي",duration:40,status:"active",participantsCount:0,createdAt:new Date().toISOString()}],this.saveCoursesToStorage())}async syncPendingChanges(){this.useAPI}filterByStatus(s){this.filterStatus=s===this.filterStatus?"all":s,this.renderAdvancedTraining()}searchCourses(s){this.searchQuery=s,this.renderAdvancedTraining()}getFilteredCourses(){let s=this.courses;if(this.filterStatus!=="all"&&(s=s.filter(t=>t.status===this.filterStatus)),this.searchQuery){const t=this.searchQuery.toLowerCase();s=s.filter(a=>a.title.toLowerCase().includes(t)||a.description&&a.description.toLowerCase().includes(t))}return s}renderAdvancedTraining(){const s=document.getElementById("advanced-training-container")||document.body;s.innerHTML=`
      <div class="advanced-training">
        <div class="header-section">
          <h2><i class="fas fa-graduation-cap"></i> نظام إدارة التدريب المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedTraining.showCreateModal()">
              <i class="fas fa-plus"></i> دورة جديدة
            </button>
            <button class="btn btn-info" onclick="advancedTraining.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="filters-section">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="search-input" placeholder="بحث في الدورات..." 
                   value="${this.searchQuery}"
                   oninput="advancedTraining.searchCourses(this.value)">
          </div>
          <div class="status-filters">
            <button class="filter-btn ${this.filterStatus==="all"?"active":""}" 
                    onclick="advancedTraining.filterByStatus('all')">
              الكل
            </button>
            <button class="filter-btn ${this.filterStatus==="active"?"active":""}" 
                    onclick="advancedTraining.filterByStatus('active')">
              <i class="fas fa-check-circle"></i> نشط
            </button>
            <button class="filter-btn ${this.filterStatus==="upcoming"?"active":""}" 
                    onclick="advancedTraining.filterByStatus('upcoming')">
              <i class="fas fa-calendar-alt"></i> قادم
            </button>
            <button class="filter-btn ${this.filterStatus==="completed"?"active":""}" 
                    onclick="advancedTraining.filterByStatus('completed')">
              <i class="fas fa-check-double"></i> مكتمل
            </button>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="courses"?"active":""}" onclick="advancedTraining.switchView('courses')">
            <i class="fas fa-book"></i> الدورات
          </button>
          <button class="tab-btn ${this.currentView==="sessions"?"active":""}" onclick="advancedTraining.switchView('sessions')">
            <i class="fas fa-calendar-day"></i> الجلسات
          </button>
          <button class="tab-btn ${this.currentView==="participants"?"active":""}" onclick="advancedTraining.switchView('participants')">
            <i class="fas fa-users"></i> المشاركون
          </button>
          <button class="tab-btn ${this.currentView==="certificates"?"active":""}" onclick="advancedTraining.switchView('certificates')">
            <i class="fas fa-certificate"></i> الشهادات
          </button>
          <button class="tab-btn ${this.currentView==="instructors"?"active":""}" onclick="advancedTraining.switchView('instructors')">
            <i class="fas fa-chalkboard-teacher"></i> المدربون
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"courses":return this.renderCourses();case"sessions":return this.renderSessions();case"participants":return this.renderParticipants();case"certificates":return this.renderCertificates();case"instructors":return this.renderInstructors();default:return this.renderCourses()}}renderCourses(){const s=this.getFilteredCourses(),t={total:this.courses.length,active:this.courses.filter(a=>a.status==="active").length,upcoming:this.courses.filter(a=>a.status==="upcoming").length,completed:this.courses.filter(a=>a.status==="completed").length};return`
      <div class="courses-view">
        <div class="courses-stats">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <i class="fas fa-book"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي الدورات</h3>
              <p class="count">${t.total}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3>نشط</h3>
              <p class="count">${t.active}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);">
              <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="stat-content">
              <h3>قادم</h3>
              <p class="count">${t.upcoming}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);">
              <i class="fas fa-check-double"></i>
            </div>
            <div class="stat-content">
              <h3>مكتمل</h3>
              <p class="count">${t.completed}</p>
            </div>
          </div>
        </div>

        <div class="courses-grid">
          ${s.map(a=>`
            <div class="course-card">
              <div class="course-header">
                <h4>${a.title}</h4>
                <span class="course-status status-${a.status}">
                  ${this.getStatusName(a.status)}
                </span>
              </div>
              <div class="course-body">
                <p>${a.description||""}</p>
                <div class="course-info">
                  <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>${a.duration||0} ساعة</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-users"></i>
                    <span>${a.participantsCount||0} مشارك</span>
                  </div>
                </div>
              </div>
              <div class="course-footer">
                <div class="course-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedTraining.viewCourse(${a.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedTraining.editCourse(${a.id})">
                    <i class="fas fa-edit"></i> تعديل
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="advancedTraining.deleteCourse(${a.id})">
                    <i class="fas fa-trash"></i> حذف
                  </button>
                </div>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد دورات</p>'}
        </div>
      </div>
    `}renderSessions(){return`
      <div class="sessions-view">
        <div class="sessions-list">
          ${this.sessions.map(s=>{const t=this.courses.find(a=>a.id===s.courseId);return`
              <div class="session-card">
                <div class="session-header">
                  <h4>${(t==null?void 0:t.title)||"دورة غير محدد"}</h4>
                  <span class="session-date">${new Date(s.date).toLocaleDateString("ar-SA")}</span>
                </div>
                <div class="session-body">
                  <div class="session-details">
                    <div class="detail-item">
                      <i class="fas fa-clock"></i>
                      <span>${s.startTime} - ${s.endTime}</span>
                    </div>
                    <div class="detail-item">
                      <i class="fas fa-map-marker-alt"></i>
                      <span>${s.location||"غير محدد"}</span>
                    </div>
                    <div class="detail-item">
                      <i class="fas fa-users"></i>
                      <span>${s.participantsCount||0} مشارك</span>
                    </div>
                  </div>
                </div>
                <div class="session-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedTraining.viewSession(${s.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا توجد جلسات</p>'}
        </div>
      </div>
    `}renderParticipants(){return`
      <div class="participants-view">
        <div class="participants-list">
          ${this.participants.map(s=>{const t=this.courses.find(a=>a.id===s.courseId);return`
              <div class="participant-card">
                <div class="participant-header">
                  <h4>${s.name||"غير محدد"}</h4>
                  <span class="participant-status status-${s.status}">
                    ${this.getParticipantStatusName(s.status)}
                  </span>
                </div>
                <div class="participant-body">
                  <div class="participant-details">
                    <div class="detail-item">
                      <i class="fas fa-book"></i>
                      <span>${(t==null?void 0:t.title)||"دورة غير محدد"}</span>
                    </div>
                    <div class="detail-item">
                      <i class="fas fa-envelope"></i>
                      <span>${s.email||"غير محدد"}</span>
                    </div>
                    <div class="detail-item">
                      <i class="fas fa-phone"></i>
                      <span>${s.phone||"غير محدد"}</span>
                    </div>
                  </div>
                </div>
                <div class="participant-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedTraining.viewParticipant(${s.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا يوجد مشاركون</p>'}
        </div>
      </div>
    `}renderCertificates(){return`
      <div class="certificates-view">
        <div class="certificates-grid">
          ${this.certificates.map(s=>{const t=this.courses.find(a=>a.id===s.courseId);return`
              <div class="certificate-card">
                <div class="certificate-header">
                  <h4>${(t==null?void 0:t.title)||"دورة غير محدد"}</h4>
                  <span class="certificate-icon">
                    <i class="fas fa-certificate"></i>
                  </span>
                </div>
                <div class="certificate-body">
                  <div class="certificate-details">
                    <div class="detail-item">
                      <span>المشارك:</span>
                      <span>${s.participantName||"غير محدد"}</span>
                    </div>
                    <div class="detail-item">
                      <span>تاريخ الإصدار:</span>
                      <span>${new Date(s.issueDate).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <div class="detail-item">
                      <span>الدرجة:</span>
                      <span>${s.grade||"غير محدد"}</span>
                    </div>
                  </div>
                </div>
                <div class="certificate-actions">
                  <button class="btn btn-sm btn-primary" onclick="advancedTraining.viewCertificate(${s.id})">
                    <i class="fas fa-eye"></i> عرض
                  </button>
                  <button class="btn btn-sm btn-success" onclick="advancedTraining.downloadCertificate(${s.id})">
                    <i class="fas fa-download"></i> تحميل
                  </button>
                </div>
              </div>
            `}).join("")||'<p class="empty-state">لا توجد شهادات</p>'}
        </div>
      </div>
    `}renderInstructors(){return`
      <div class="instructors-view">
        <div class="instructors-grid">
          ${this.instructors.map(s=>`
            <div class="instructor-card">
              <div class="instructor-header">
                <div class="instructor-avatar">
                  ${s.photo?`
                    <img src="${s.photo}" alt="${s.name}">
                  `:`
                    <i class="fas fa-user"></i>
                  `}
                </div>
                <div class="instructor-info">
                  <h4>${s.name}</h4>
                  <p>${s.specialization||"غير محدد"}</p>
                </div>
              </div>
              <div class="instructor-body">
                <div class="instructor-details">
                  <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${s.email||"غير محدد"}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${s.phone||"غير محدد"}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-book"></i>
                    <span>${s.coursesCount||0} دورة</span>
                  </div>
                </div>
              </div>
              <div class="instructor-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedTraining.viewInstructor(${s.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedTraining.editInstructor(${s.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا يوجد مدربون</p>'}
        </div>
      </div>
    `}getStatusName(s){return{active:"نشط",upcoming:"قادم",completed:"مكتمل",cancelled:"ملغي"}[s]||s}getParticipantStatusName(s){return{registered:"مسجل",attending:"يحضر",completed:"مكتمل",absent:"غائب"}[s]||s}switchView(s){this.currentView=s,this.renderAdvancedTraining()}viewCourse(s){alert(`عرض الدورة #${s} - سيتم التطوير قريباً`)}editCourse(s){alert(`تعديل الدورة #${s} - سيتم التطوير قريباً`)}async deleteCourse(s){var t,a,i;if(confirm("هل أنت متأكد من حذف هذه الدورة؟"))try{this.useAPI&&n?(i=(await n.delete(((a=(t=e==null?void 0:e.advancedTraining)==null?void 0:t.courses)==null?void 0:a.delete)||`/api/advanced-training/courses/${s}`)).data)!=null&&i.success&&(r&&r.clear(["training"]),await this.loadCourses(),typeof showToast=="function"&&showToast("تم حذف الدورة","success")):(this.courses=this.courses.filter(c=>c.id!==s),this.saveCoursesToStorage(),this.renderAdvancedTraining())}catch(c){console.error("Error deleting course:",c),typeof showToast=="function"&&showToast("فشل حذف الدورة","error")}}viewSession(s){alert(`عرض الجلسة #${s} - سيتم التطوير قريباً`)}viewParticipant(s){alert(`عرض المشارك #${s} - سيتم التطوير قريباً`)}viewCertificate(s){alert(`عرض الشهادة #${s} - سيتم التطوير قريباً`)}downloadCertificate(s){alert(`تحميل الشهادة #${s} - سيتم التطوير قريباً`)}viewInstructor(s){alert(`عرض المدرب #${s} - سيتم التطوير قريباً`)}editInstructor(s){alert(`تعديل المدرب #${s} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء دورة - سيتم التطوير قريباً")}async refresh(){r&&r.clear(["training"]),await this.loadCourses(),await this.loadSessions(),await this.loadParticipants(),await this.loadCertificates(),await this.loadInstructors(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const f=new p;typeof window<"u"&&(window.advancedTraining=f,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(f,"advancedTraining"));typeof u<"u"&&u.exports&&(u.exports=p)});export default w();
//# sourceMappingURL=rehabilitation-center-advanced-training-BvQGtTZc.js.map
