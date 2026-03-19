import{a as o,A as v,c as u,r as h,s as p,b as g,d as m}from"./main-DFR0ngT_.js";class S{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=o,this.API_ENDPOINTS=v.advancedELearning||{},this.connectionManager=u,this.realtimeSync=h,this.systemEnhancer=p,this.aiAssistant=g,this.advancedCache=m,this.courses=[],this.lessons=[],this.students=[],this.enrollments=[],this.assignments=[],this.quizzes=[],this.resources=[],this.liveSessions=[],this.certificates=[],this.analytics=[],this.currentView="courses",this.filters={category:"all",status:"all",level:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-elearning-management">
        <div class="elearning-header">
          <h2>🎓 نظام التعلم عن بعد المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createCourse()">
              <i class="fas fa-plus"></i> دورة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createLiveSession()">
              <i class="fas fa-video"></i> جلسة مباشرة
            </button>
          </div>
        </div>

        <div class="elearning-tabs">
          <button class="tab-btn ${this.currentView==="courses"?"active":""}" 
                  onclick="this.switchView('courses')">
            <i class="fas fa-book"></i> الدورات
          </button>
          <button class="tab-btn ${this.currentView==="lessons"?"active":""}" 
                  onclick="this.switchView('lessons')">
            <i class="fas fa-chalkboard-teacher"></i> الدروس
          </button>
          <button class="tab-btn ${this.currentView==="students"?"active":""}" 
                  onclick="this.switchView('students')">
            <i class="fas fa-user-graduate"></i> الطلاب
          </button>
          <button class="tab-btn ${this.currentView==="enrollments"?"active":""}" 
                  onclick="this.switchView('enrollments')">
            <i class="fas fa-user-check"></i> التسجيلات
          </button>
          <button class="tab-btn ${this.currentView==="assignments"?"active":""}" 
                  onclick="this.switchView('assignments')">
            <i class="fas fa-tasks"></i> الواجبات
          </button>
          <button class="tab-btn ${this.currentView==="quizzes"?"active":""}" 
                  onclick="this.switchView('quizzes')">
            <i class="fas fa-question-circle"></i> الاختبارات
          </button>
          <button class="tab-btn ${this.currentView==="resources"?"active":""}" 
                  onclick="this.switchView('resources')">
            <i class="fas fa-folder-open"></i> الموارد
          </button>
          <button class="tab-btn ${this.currentView==="liveSessions"?"active":""}" 
                  onclick="this.switchView('liveSessions')">
            <i class="fas fa-video"></i> الجلسات المباشرة
          </button>
          <button class="tab-btn ${this.currentView==="certificates"?"active":""}" 
                  onclick="this.switchView('certificates')">
            <i class="fas fa-certificate"></i> الشهادات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="elearning-filters">
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="technical">تقني</option>
            <option value="medical">طبي</option>
            <option value="educational">تعليمي</option>
            <option value="rehabilitation">تأهيلي</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="archived">مؤرشف</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="elearning-content" id="elearningContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"courses":return this.renderCourses();case"lessons":return this.renderLessons();case"students":return this.renderStudents();case"enrollments":return this.renderEnrollments();case"assignments":return this.renderAssignments();case"quizzes":return this.renderQuizzes();case"resources":return this.renderResources();case"liveSessions":return this.renderLiveSessions();case"certificates":return this.renderCertificates();case"analytics":return this.renderAnalytics();default:return this.renderCourses()}}renderCourses(){const s=this.getFilteredData(this.courses);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-book"></i>
          <p>لا توجد دورات</p>
          <button class="btn btn-primary" onclick="this.createCourse()">
            إضافة دورة جديدة
          </button>
        </div>
      `:`
      <div class="courses-grid">
        ${s.map(e=>`
          <div class="course-card status-${e.status} level-${e.level}">
            <div class="course-header">
              <div class="course-image">
                <i class="fas fa-graduation-cap"></i>
              </div>
              <div class="course-info">
                <h3>${e.title||"دورة"}</h3>
                <p class="course-instructor">${e.instructorName||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${e.status}">${this.getStatusText(e.status)}</span>
            </div>
            <div class="course-body">
              <div class="course-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${this.getCategoryText(e.category)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المستوى:</span>
                  <span class="detail-value">${this.getLevelText(e.level)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الدروس:</span>
                  <span class="detail-value">${e.lessonsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الطلاب:</span>
                  <span class="detail-value">${e.studentsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${e.duration||"غير محدد"}</span>
                </div>
                ${e.price?`
                  <div class="detail-item">
                    <span class="detail-label">السعر:</span>
                    <span class="detail-value">${this.formatCurrency(e.price)}</span>
                  </div>
                `:""}
              </div>
              ${e.description?`
                <div class="course-description">
                  <p>${e.description.substring(0,150)}${e.description.length>150?"...":""}</p>
                </div>
              `:""}
            </div>
            <div class="course-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewCourse(${e.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editCourse(${e.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderLessons(){return this.lessons.length===0?`
        <div class="empty-state">
          <i class="fas fa-chalkboard-teacher"></i>
          <p>لا توجد دروس</p>
        </div>
      `:`
      <div class="lessons-list">
        ${this.lessons.map(s=>`
          <div class="lesson-card type-${s.type} status-${s.status}">
            <div class="lesson-header">
              <h3>${s.title||"درس"}</h3>
              <span class="lesson-type">${this.getLessonTypeText(s.type)}</span>
            </div>
            <div class="lesson-body">
              <div class="lesson-details">
                <div class="detail-item">
                  <span class="detail-label">الدورة:</span>
                  <span class="detail-value">${s.courseTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الترتيب:</span>
                  <span class="detail-value">${s.order||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderStudents(){return this.students.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-graduate"></i>
          <p>لا يوجد طلاب</p>
        </div>
      `:`
      <div class="students-grid">
        ${this.students.map(s=>`
          <div class="student-card">
            <div class="student-header">
              <div class="student-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="student-info">
                <h3>${s.name||"طالب"}</h3>
                <p class="student-email">${s.email||"غير محدد"}</p>
              </div>
            </div>
            <div class="student-body">
              <div class="student-details">
                <div class="detail-item">
                  <span class="detail-label">عدد الدورات:</span>
                  <span class="detail-value">${s.coursesCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الشهادات:</span>
                  <span class="detail-value">${s.certificatesCount||0}</span>
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
    `}renderEnrollments(){return this.enrollments.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-check"></i>
          <p>لا توجد تسجيلات</p>
        </div>
      `:`
      <div class="enrollments-list">
        ${this.enrollments.map(s=>`
          <div class="enrollment-card status-${s.status}">
            <div class="enrollment-header">
              <h3>${s.studentName||"تسجيل"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="enrollment-body">
              <div class="enrollment-details">
                <div class="detail-item">
                  <span class="detail-label">الدورة:</span>
                  <span class="detail-value">${s.courseTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ التسجيل:</span>
                  <span class="detail-value">${this.formatDate(s.enrollmentDate)}</span>
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
    `}renderAssignments(){return this.assignments.length===0?`
        <div class="empty-state">
          <i class="fas fa-tasks"></i>
          <p>لا توجد واجبات</p>
        </div>
      `:`
      <div class="assignments-list">
        ${this.assignments.map(s=>`
          <div class="assignment-card status-${s.status}">
            <div class="assignment-header">
              <h3>${s.title||"واجب"}</h3>
              <span class="assignment-deadline">${this.formatDate(s.deadline)}</span>
            </div>
            <div class="assignment-body">
              <div class="assignment-details">
                <div class="detail-item">
                  <span class="detail-label">الدورة:</span>
                  <span class="detail-value">${s.courseTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد التقديمات:</span>
                  <span class="detail-value">${s.submissionsCount||0}</span>
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
    `}renderQuizzes(){return this.quizzes.length===0?`
        <div class="empty-state">
          <i class="fas fa-question-circle"></i>
          <p>لا توجد اختبارات</p>
        </div>
      `:`
      <div class="quizzes-list">
        ${this.quizzes.map(s=>`
          <div class="quiz-card status-${s.status}">
            <div class="quiz-header">
              <h3>${s.title||"اختبار"}</h3>
              <span class="quiz-questions">${s.questionsCount||0} سؤال</span>
            </div>
            <div class="quiz-body">
              <div class="quiz-details">
                <div class="detail-item">
                  <span class="detail-label">الدورة:</span>
                  <span class="detail-value">${s.courseTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الدرجة المطلوبة:</span>
                  <span class="detail-value">${s.passingScore||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderResources(){return this.resources.length===0?`
        <div class="empty-state">
          <i class="fas fa-folder-open"></i>
          <p>لا توجد موارد</p>
        </div>
      `:`
      <div class="resources-grid">
        ${this.resources.map(s=>`
          <div class="resource-card type-${s.type}">
            <div class="resource-header">
              <h3>${s.title||"مورد"}</h3>
              <span class="resource-type">${this.getResourceTypeText(s.type)}</span>
            </div>
            <div class="resource-body">
              <div class="resource-details">
                <div class="detail-item">
                  <span class="detail-label">الحجم:</span>
                  <span class="detail-value">${s.size||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد التحميلات:</span>
                  <span class="detail-value">${s.downloadsCount||0}</span>
                </div>
              </div>
            </div>
            <div class="resource-actions">
              <button class="btn btn-sm btn-primary" onclick="this.downloadResource(${s.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderLiveSessions(){return this.liveSessions.length===0?`
        <div class="empty-state">
          <i class="fas fa-video"></i>
          <p>لا توجد جلسات مباشرة</p>
          <button class="btn btn-primary" onclick="this.createLiveSession()">
            إضافة جلسة مباشرة
          </button>
        </div>
      `:`
      <div class="live-sessions-list">
        ${this.liveSessions.map(s=>`
          <div class="live-session-card status-${s.status}">
            <div class="live-session-header">
              <h3>${s.title||"جلسة مباشرة"}</h3>
              <span class="session-status status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="live-session-body">
              <div class="live-session-details">
                <div class="detail-item">
                  <span class="detail-label">الدورة:</span>
                  <span class="detail-value">${s.courseTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ والوقت:</span>
                  <span class="detail-value">${this.formatDateTime(s.scheduledAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المشاركين:</span>
                  <span class="detail-value">${s.participantsCount||0}</span>
                </div>
              </div>
            </div>
            ${s.status==="scheduled"?`
              <div class="live-session-actions">
                <button class="btn btn-sm btn-success" onclick="this.startSession(${s.id})">
                  <i class="fas fa-play"></i> بدء
                </button>
              </div>
            `:""}
          </div>
        `).join("")}
      </div>
    `}renderCertificates(){return this.certificates.length===0?`
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <p>لا توجد شهادات</p>
        </div>
      `:`
      <div class="certificates-list">
        ${this.certificates.map(s=>`
          <div class="certificate-card">
            <div class="certificate-header">
              <h3>${s.studentName||"شهادة"}</h3>
              <span class="certificate-date">${this.formatDate(s.issueDate)}</span>
            </div>
            <div class="certificate-body">
              <div class="certificate-details">
                <div class="detail-item">
                  <span class="detail-label">الدورة:</span>
                  <span class="detail-value">${s.courseTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الدرجة:</span>
                  <span class="detail-value">${s.score||0}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الرقم التسلسلي:</span>
                  <span class="detail-value">${s.serialNumber||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="certificate-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewCertificate(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.downloadCertificate(${s.id})">
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
    `}getFilteredData(s){let e=[...s];if(this.filters.category!=="all"&&(e=e.filter(t=>t.category===this.filters.category)),this.filters.status!=="all"&&(e=e.filter(t=>t.status===this.filters.status)),this.filters.level!=="all"&&(e=e.filter(t=>t.level===this.filters.level)),this.filters.search){const t=this.filters.search.toLowerCase();e=e.filter(a=>a.title&&a.title.toLowerCase().includes(t)||a.name&&a.name.toLowerCase().includes(t))}return e}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,e,t,a,i,n,l,c,r,d]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.courses||"/api/advanced-elearning/courses"),this.apiClient.get(this.API_ENDPOINTS.lessons||"/api/advanced-elearning/lessons"),this.apiClient.get(this.API_ENDPOINTS.students||"/api/advanced-elearning/students"),this.apiClient.get(this.API_ENDPOINTS.enrollments||"/api/advanced-elearning/enrollments"),this.apiClient.get(this.API_ENDPOINTS.assignments||"/api/advanced-elearning/assignments"),this.apiClient.get(this.API_ENDPOINTS.quizzes||"/api/advanced-elearning/quizzes"),this.apiClient.get(this.API_ENDPOINTS.resources||"/api/advanced-elearning/resources"),this.apiClient.get(this.API_ENDPOINTS.liveSessions||"/api/advanced-elearning/live-sessions"),this.apiClient.get(this.API_ENDPOINTS.certificates||"/api/advanced-elearning/certificates"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-elearning/analytics")]);this.courses=s.data||[],this.lessons=e.data||[],this.students=t.data||[],this.enrollments=a.data||[],this.assignments=i.data||[],this.quizzes=n.data||[],this.resources=l.data||[],this.liveSessions=c.data||[],this.certificates=r.data||[],this.analytics=d.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading e-learning data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-elearning","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,e){this.filters[s]=e.target.value,this.updateContent()}handleSearch(s){this.filters.search=s.target.value,this.updateContent()}updateContent(){const s=document.getElementById("elearningContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{draft:"مسودة",published:"منشور",archived:"مؤرشف",enrolled:"مسجل",completed:"مكتمل",inprogress:"قيد التنفيذ",scheduled:"مجدولة",live:"مباشر",ended:"منتهية",pending:"قيد الانتظار",graded:"مصحح"}[s]||s}getCategoryText(s){return{technical:"تقني",medical:"طبي",educational:"تعليمي",rehabilitation:"تأهيلي"}[s]||s}getLevelText(s){return{beginner:"مبتدئ",intermediate:"متوسط",advanced:"متقدم",expert:"خبير"}[s]||s}getLessonTypeText(s){return{video:"فيديو",text:"نص",audio:"صوتي",interactive:"تفاعلي"}[s]||s}getResourceTypeText(s){return{pdf:"PDF",video:"فيديو",audio:"صوتي",image:"صورة",document:"مستند",link:"رابط"}[s]||s}formatCurrency(s){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(s)}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedCourses",JSON.stringify(this.courses)),localStorage.setItem("advancedLessons",JSON.stringify(this.lessons)),localStorage.setItem("advancedStudents",JSON.stringify(this.students)),localStorage.setItem("advancedEnrollments",JSON.stringify(this.enrollments)),localStorage.setItem("advancedAssignments",JSON.stringify(this.assignments)),localStorage.setItem("advancedQuizzes",JSON.stringify(this.quizzes)),localStorage.setItem("advancedResources",JSON.stringify(this.resources)),localStorage.setItem("advancedLiveSessions",JSON.stringify(this.liveSessions)),localStorage.setItem("advancedCertificates",JSON.stringify(this.certificates)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.courses=JSON.parse(localStorage.getItem("advancedCourses")||"[]"),this.lessons=JSON.parse(localStorage.getItem("advancedLessons")||"[]"),this.students=JSON.parse(localStorage.getItem("advancedStudents")||"[]"),this.enrollments=JSON.parse(localStorage.getItem("advancedEnrollments")||"[]"),this.assignments=JSON.parse(localStorage.getItem("advancedAssignments")||"[]"),this.quizzes=JSON.parse(localStorage.getItem("advancedQuizzes")||"[]"),this.resources=JSON.parse(localStorage.getItem("advancedResources")||"[]"),this.liveSessions=JSON.parse(localStorage.getItem("advancedLiveSessions")||"[]"),this.certificates=JSON.parse(localStorage.getItem("advancedCertificates")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createCourse=this.createCourse.bind(this),this.createLiveSession=this.createLiveSession.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewCourse=this.viewCourse.bind(this),this.editCourse=this.editCourse.bind(this),this.startSession=this.startSession.bind(this),this.downloadResource=this.downloadResource.bind(this),this.viewCertificate=this.viewCertificate.bind(this),this.downloadCertificate=this.downloadCertificate.bind(this)}async createCourse(){console.log("Create course")}async createLiveSession(){console.log("Create live session")}async viewCourse(s){console.log("View course",s)}async editCourse(s){console.log("Edit course",s)}async startSession(s){console.log("Start session",s)}async downloadResource(s){console.log("Download resource",s)}async viewCertificate(s){console.log("View certificate",s)}async downloadCertificate(s){console.log("Download certificate",s)}}export{S as default};
//# sourceMappingURL=rehabilitation-center-advanced-elearning-BgWIXwE1.js.map
