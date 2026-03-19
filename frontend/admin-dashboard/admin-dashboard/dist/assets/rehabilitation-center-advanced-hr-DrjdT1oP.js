import{a as o,A as p,c as h,r as v,s as m,b as u,d as f}from"./main-DFR0ngT_.js";class g{constructor(e){this.container=e,this.useAPI=!0,this.apiClient=o,this.API_ENDPOINTS=p.advancedHR||{},this.connectionManager=h,this.realtimeSync=v,this.systemEnhancer=m,this.aiAssistant=u,this.advancedCache=f,this.employees=[],this.departments=[],this.positions=[],this.leaves=[],this.attendance=[],this.performance=[],this.recruitment=[],this.training=[],this.payroll=[],this.analytics=[],this.currentView="employees",this.filters={status:"all",department:"all",position:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){if(!this.container)return;let e=[];this.aiAssistant&&typeof this.aiAssistant.getSuggestions=="function"&&(e=this.aiAssistant.getSuggestions({currentModule:"employees",filters:this.filters})||[]),this.container.innerHTML=`
      <div class="advanced-hr-management">
        <div class="hr-header">
          <h2>👥 نظام إدارة الموارد البشرية المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createEmployee()">
              <i class="fas fa-user-plus"></i> موظف جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createDepartment()">
              <i class="fas fa-building"></i> قسم جديد
            </button>
          </div>
        </div>

        <div class="hr-tabs">
          <button class="tab-btn ${this.currentView==="employees"?"active":""}" onclick="this.switchView('employees')">
            <i class="fas fa-users"></i> الموظفين
          </button>
          <button class="tab-btn ${this.currentView==="departments"?"active":""}" onclick="this.switchView('departments')">
            <i class="fas fa-building"></i> الأقسام
          </button>
          <button class="tab-btn ${this.currentView==="positions"?"active":""}" onclick="this.switchView('positions')">
            <i class="fas fa-briefcase"></i> الوظائف
          </button>
          <button class="tab-btn ${this.currentView==="leaves"?"active":""}" onclick="this.switchView('leaves')">
            <i class="fas fa-calendar-times"></i> الإجازات
          </button>
          <button class="tab-btn ${this.currentView==="attendance"?"active":""}" onclick="this.switchView('attendance')">
            <i class="fas fa-clock"></i> الحضور
          </button>
          <button class="tab-btn ${this.currentView==="performance"?"active":""}" onclick="this.switchView('performance')">
            <i class="fas fa-chart-line"></i> الأداء
          </button>
          <button class="tab-btn ${this.currentView==="recruitment"?"active":""}" onclick="this.switchView('recruitment')">
            <i class="fas fa-user-tie"></i> التوظيف
          </button>
          <button class="tab-btn ${this.currentView==="training"?"active":""}" onclick="this.switchView('training')">
            <i class="fas fa-graduation-cap"></i> التدريب
          </button>
          <button class="tab-btn ${this.currentView==="payroll"?"active":""}" onclick="this.switchView('payroll')">
            <i class="fas fa-money-bill-wave"></i> الرواتب
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
          <button class="tab-btn ${this.currentView==="hr-calendar"?"active":""}" onclick="this.switchView('hr-calendar')">
            <i class="fas fa-calendar-alt"></i> تقويم الموارد البشرية
          </button>
        </div>

        <div class="hr-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="on-leave">في إجازة</option>
            <option value="terminated">منتهي</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('department', event)">
            <option value="all">جميع الأقسام</option>
            ${this.departments.map(a=>`
              <option value="${a.id}">${a.name}</option>
            `).join("")}
          </select>
          <input type="text" class="search-input" placeholder="بحث..." oninput="this.handleSearch(event)">
                  <div class="smart-suggestions" style="margin-top:6px;">
                    ${e.length?e.map(a=>`
                      <span class="suggestion-chip" style="display:inline-block;background:#f3f4f6;border-radius:16px;padding:4px 12px;margin:2px;cursor:pointer;" onclick="window.hrManager.applySmartSuggestion('${a.title.replace(/'/g,"'")}')">
                        <i class="fas fa-magic"></i> ${a.title}
                      </span>
                    `).join(""):""}
                  </div>
          // Apply smart suggestion to search
          applySmartSuggestion(suggestion) {
            this.filters.search = suggestion;
            this.updateContent();
          }
        </div>

        <div class="hr-content" id="hrContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"employees":return this.renderEmployees();case"departments":return this.renderDepartments();case"positions":return this.renderPositions();case"leaves":return this.renderLeaves();case"attendance":return this.renderAttendance();case"performance":return this.renderPerformance();case"recruitment":return this.renderRecruitment();case"training":return this.renderTraining();case"payroll":return this.renderPayroll();case"analytics":return this.renderAnalytics();case"hr-calendar":return this.renderHRCalendar();default:return this.renderEmployees()}}renderHRCalendar(){const e=[];return this.attendance.forEach(a=>{e.push({id:`att-${a.id}`,title:`حضور: ${a.employeeName||a.employeeId}`,description:`وقت الدخول: ${a.checkIn||""} - وقت الخروج: ${a.checkOut||""}`,start:a.date?new Date(a.date):new Date,end:a.date?new Date(a.date):new Date,calendar:"الحضور",color:"#4ade80"})}),this.leaves.forEach(a=>{e.push({id:`leave-${a.id}`,title:`إجازة: ${a.employeeName||a.employeeId}`,description:`نوع الإجازة: ${a.type||""}`,start:a.startDate?new Date(a.startDate):new Date,end:a.endDate?new Date(a.endDate):new Date,calendar:"الإجازات",color:"#fbbf24"})}),this.training.forEach(a=>{e.push({id:`train-${a.id}`,title:`تدريب: ${a.title}`,description:`المشاركون: ${a.participantsCount||0}`,start:a.date?new Date(a.date):new Date,end:a.date?new Date(a.date):new Date,calendar:"التدريب",color:"#3b82f6"})}),setTimeout(()=>{window.calendarManager&&(window.calendarManager.events=e,window.calendarManager.renderCalendar())},0),`
      <div>
        <div id="calendarContainer"></div>
      </div>
    `}renderEmployees(){const e=this.getFilteredData(this.employees);return e.length===0?`
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>لا يوجد موظفين</p>
          <button class="btn btn-primary" onclick="this.createEmployee()">
            إضافة موظف جديد
          </button>
        </div>
      `:`
      <div class="employees-grid">
        ${e.map(a=>`
          <div class="employee-card status-${a.status}">
            <div class="employee-header">
              <div class="employee-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="employee-info">
                <h3>${a.name||"غير محدد"}</h3>
                <p class="employee-id">${a.employeeId||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="employee-body">
              <div class="employee-details">
                <div class="detail-item">
                  <span class="detail-label">القسم:</span>
                  <span class="detail-value">${a.departmentName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوظيفة:</span>
                  <span class="detail-value">${a.positionName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${a.email||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${a.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ التعيين:</span>
                  <span class="detail-value">${this.formatDate(a.hireDate)}</span>
                </div>
              </div>
            </div>
            <div class="employee-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewEmployee(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editEmployee(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
              <button class="btn btn-sm btn-info" onclick="window.hrManager.showEmployeeDocuments(${a.id})">
                <i class='fas fa-file-upload'></i> المستندات
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}showEmployeeDocuments(e){const a=this.employees.find(i=>i.id===e);if(!a)return;const t=document.createElement("div");t.className="modal",t.innerHTML=`
        <div class="modal-content" style="max-width:700px">
          <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
          <h2>مستندات الموظف: ${a.name||a.employeeId||""}</h2>
          <div id="employeeFilesContainer"></div>
          <button class="btn btn-primary" id="uploadEmployeeFileBtn"><i class='fas fa-upload'></i> رفع مستند</button>
        </div>
      `,document.body.appendChild(t),fileManager.employeeFiles||(fileManager.employeeFiles={}),fileManager.employeeFiles[e]||(fileManager.employeeFiles[e]=[]);function s(){const i=t.querySelector("#employeeFilesContainer"),r=fileManager.employeeFiles[e];if(i){if(!r.length){i.innerHTML="<div class='empty-state'><i class='fas fa-file'></i><p>لا يوجد مستندات</p></div>";return}i.innerHTML=`<div class='files-grid'>${r.map(n=>`
          <div class='file-card'>
            <div class='file-icon'><i class='fas fa-${fileManager.getFileIcon(n.type)}'></i></div>
            <div class='file-info'>
              <h4>${n.name}</h4>
              <p><strong>الحجم:</strong> ${fileManager.formatFileSize(n.size)}</p>
              <p><strong>رفع بواسطة:</strong> ${n.uploadedBy}</p>
              <p><strong>تاريخ الرفع:</strong> ${Utils.formatDate(n.uploadedAt)}</p>
            </div>
            <div class='file-actions'>
              <button class='btn btn-sm btn-success' onclick='window.hrManager.downloadEmployeeFile(${e},"${n.id}")'><i class='fas fa-download'></i> تحميل</button>
              <button class='btn btn-sm btn-info' onclick='window.hrManager.previewEmployeeFile(${e},"${n.id}")'><i class='fas fa-eye'></i> معاينة</button>
              <button class='btn btn-sm btn-danger' onclick='window.hrManager.deleteEmployeeFile(${e},"${n.id}")'><i class='fas fa-trash'></i> حذف</button>
            </div>
          </div>
        `).join("")}</div>`}}s(),t.querySelector("#uploadEmployeeFileBtn").onclick=()=>{const i=document.createElement("input");i.type="file",i.multiple=!0,i.onchange=r=>{const n=Array.from(r.target.files);n.forEach(l=>{const c={id:Date.now()+Math.random(),name:l.name,type:fileManager.getFileType(l.name),size:l.size,uploadedBy:"Super Admin",uploadedAt:new Date,downloads:0};fileManager.employeeFiles[e].push(c)}),s(),Utils.showNotification(`تم رفع ${n.length} مستند`,"success")},i.click()}}downloadEmployeeFile(e,a){const s=(fileManager.employeeFiles&&fileManager.employeeFiles[e]||[]).find(i=>i.id==a);s&&(s.downloads=(s.downloads||0)+1,Utils.showNotification(`جاري تحميل ${s.name}...`,"info"))}previewEmployeeFile(e,a){const s=(fileManager.employeeFiles&&fileManager.employeeFiles[e]||[]).find(r=>r.id==a);if(!s)return;const i=document.createElement("div");i.className="modal",i.innerHTML=`
        <div class='modal-content'>
          <span class='close' onclick='this.closest(".modal").remove()'>&times;</span>
          <h2>معاينة المستند: ${s.name}</h2>
          <div class='file-preview'>
            <p>هذه معاينة للملف. سيتم عرض محتوى الملف هنا.</p>
            <p><strong>النوع:</strong> ${s.type}</p>
            <p><strong>الحجم:</strong> ${fileManager.formatFileSize(s.size)}</p>
          </div>
        </div>
      `,document.body.appendChild(i)}deleteEmployeeFile(e,a){var t,s;if(!(!fileManager.employeeFiles||!fileManager.employeeFiles[e])&&confirm("هل أنت متأكد من حذف هذا المستند؟")){fileManager.employeeFiles[e]=fileManager.employeeFiles[e].filter(r=>r.id!=a);const i=(s=(t=document.querySelector(".modal .modal-content h2"))==null?void 0:t.textContent)!=null&&s.includes("مستندات الموظف")?document.querySelector(".modal"):null;i&&(this.showEmployeeDocuments(e),i.remove()),Utils.showNotification("تم حذف المستند","success")}}renderDepartments(){return this.departments.length===0?`
        <div class="empty-state">
          <i class="fas fa-building"></i>
          <p>لا توجد أقسام</p>
          <button class="btn btn-primary" onclick="this.createDepartment()">
            إضافة قسم جديد
          </button>
        </div>
      `:`
      <div class="departments-grid">
        ${this.departments.map(e=>`
          <div class="department-card">
            <div class="department-header">
              <h3>${e.name||"قسم"}</h3>
              <span class="department-code">${e.code||"غير محدد"}</span>
            </div>
            <div class="department-body">
              <div class="department-details">
                <div class="detail-item">
                  <span class="detail-label">المدير:</span>
                  <span class="detail-value">${e.managerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الموظفين:</span>
                  <span class="detail-value">${e.employeeCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${e.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الميزانية:</span>
                  <span class="detail-value">${e.budget||0} ريال</span>
                </div>
              </div>
            </div>
            <div class="department-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewDepartment(${e.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editDepartment(${e.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPositions(){return this.positions.length===0?`
        <div class="empty-state">
          <i class="fas fa-briefcase"></i>
          <p>لا توجد وظائف</p>
        </div>
      `:`
      <div class="positions-list">
        ${this.positions.map(e=>`
          <div class="position-card">
            <div class="position-header">
              <h3>${e.title||"وظيفة"}</h3>
              <span class="position-level">${e.level||"غير محدد"}</span>
            </div>
            <div class="position-body">
              <div class="position-details">
                <div class="detail-item">
                  <span class="detail-label">القسم:</span>
                  <span class="detail-value">${e.departmentName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الراتب:</span>
                  <span class="detail-value">${e.salary||0} ريال</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الموظفين:</span>
                  <span class="detail-value">${e.employeeCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderLeaves(){return this.leaves.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-times"></i>
          <p>لا توجد إجازات</p>
        </div>
      `:`
      <div class="leaves-list">
        ${this.leaves.map(e=>`
          <div class="leave-card status-${e.status} type-${e.type}">
            <div class="leave-header">
              <h3>${e.employeeName||"إجازة"}</h3>
              <span class="status-badge status-${e.status}">${this.getStatusText(e.status)}</span>
            </div>
            <div class="leave-body">
              <div class="leave-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getLeaveTypeText(e.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${this.formatDate(e.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${this.formatDate(e.endDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأيام:</span>
                  <span class="detail-value">${e.days||0}</span>
                </div>
              </div>
            </div>
            ${e.status==="pending"?`
              <div class="leave-actions">
                <button class="btn btn-sm btn-success" onclick="this.approveLeave(${e.id})">
                  <i class="fas fa-check"></i> موافقة
                </button>
                <button class="btn btn-sm btn-danger" onclick="this.rejectLeave(${e.id})">
                  <i class="fas fa-times"></i> رفض
                </button>
              </div>
            `:""}
          </div>
        `).join("")}
      </div>
    `}renderAttendance(){return this.attendance.length===0?`
        <div class="empty-state">
          <i class="fas fa-clock"></i>
          <p>لا توجد سجلات حضور</p>
        </div>
      `:`
      <div class="attendance-list">
        ${this.attendance.map(e=>`
          <div class="attendance-card status-${e.status}">
            <div class="attendance-header">
              <h3>${e.employeeName||"حضور"}</h3>
              <span class="attendance-date">${this.formatDate(e.date)}</span>
            </div>
            <div class="attendance-body">
              <div class="attendance-details">
                <div class="detail-item">
                  <span class="detail-label">وقت الدخول:</span>
                  <span class="detail-value">${e.checkIn||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">وقت الخروج:</span>
                  <span class="detail-value">${e.checkOut||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">ساعات العمل:</span>
                  <span class="detail-value">${e.hours||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(e.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPerformance(){return this.performance.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <p>لا توجد تقييمات أداء</p>
        </div>
      `:`
      <div class="performance-list">
        ${this.performance.map(e=>`
          <div class="performance-card level-${this.getPerformanceLevel(e.score)}">
            <div class="performance-header">
              <h3>${e.employeeName||"أداء"}</h3>
              <span class="performance-score score-${this.getPerformanceLevel(e.score)}">
                ${e.score||0}%
              </span>
            </div>
            <div class="performance-body">
              <div class="performance-details">
                <div class="detail-item">
                  <span class="detail-label">الفترة:</span>
                  <span class="detail-value">${e.period||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقييم:</span>
                  <span class="detail-value">${e.rating||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRecruitment(){return this.recruitment.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-tie"></i>
          <p>لا توجد طلبات توظيف</p>
        </div>
      `:`
      <div class="recruitment-list">
        ${this.recruitment.map(e=>`
          <div class="recruitment-card status-${e.status}">
            <div class="recruitment-header">
              <h3>${e.position||"طلب توظيف"}</h3>
              <span class="status-badge status-${e.status}">${this.getStatusText(e.status)}</span>
            </div>
            <div class="recruitment-body">
              <div class="recruitment-details">
                <div class="detail-item">
                  <span class="detail-label">المتقدم:</span>
                  <span class="detail-value">${e.applicantName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(e.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(e.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTraining(){return this.training.length===0?`
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <p>لا توجد برامج تدريب</p>
        </div>
      `:`
      <div class="training-list">
        ${this.training.map(e=>`
          <div class="training-card status-${e.status}">
            <div class="training-header">
              <h3>${e.title||"برنامج تدريبي"}</h3>
              <span class="status-badge status-${e.status}">${this.getStatusText(e.status)}</span>
            </div>
            <div class="training-body">
              <div class="training-details">
                <div class="detail-item">
                  <span class="detail-label">المشاركون:</span>
                  <span class="detail-value">${e.participantsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(e.date)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPayroll(){return this.payroll.length===0?`
        <div class="empty-state">
          <i class="fas fa-money-bill-wave"></i>
          <p>لا توجد سجلات رواتب</p>
        </div>
      `:`
      <div class="payroll-list">
        ${this.payroll.map(e=>`
          <div class="payroll-card">
            <div class="payroll-header">
              <h3>${e.employeeName||"راتب"}</h3>
              <span class="payroll-amount">${e.amount||0} ريال</span>
            </div>
            <div class="payroll-body">
              <div class="payroll-details">
                <div class="detail-item">
                  <span class="detail-label">الفترة:</span>
                  <span class="detail-value">${e.period||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(e.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAnalytics(){if(this.analytics.length===0)return`
        <div class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <p>لا توجد بيانات تحليلية</p>
        </div>
      `;const e=this.analytics.map(t=>`
      <div class="analytic-card">
        <div class="analytic-header">
          <h3>${t.metric}</h3>
          <span class="analytic-value">${t.value}</span>
        </div>
        <div class="analytic-body">
          <p>${t.description||""}</p>
          ${t.trend?`
            <div class="analytic-trend ${t.trend>0?"up":"down"}">
              <i class="fas fa-arrow-${t.trend>0?"up":"down"}"></i>
              ${Math.abs(t.trend)}%
            </div>
          `:""}
        </div>
      </div>
    `).join(""),a=`
      <div class="charts-section">
        <div class="chart-container">
          <h4>الحضور الشهري</h4>
          <canvas id="attendanceLineChart" height="300"></canvas>
        </div>
        <div class="chart-container">
          <h4>توزيع حالات الموظفين</h4>
          <canvas id="statusPieChart" height="300"></canvas>
        </div>
        <div class="chart-container">
          <h4>معدل الأداء حسب القسم</h4>
          <canvas id="performanceBarChart" height="300"></canvas>
        </div>
      </div>
    `;return setTimeout(()=>{this.renderAnalyticsCharts()},0),`
      <div class="analytics-dashboard">
        ${e}
      </div>
      ${a}
    `}renderAnalyticsCharts(){const e=this.getLast12MonthsLabels(),a=e.map(n=>this.attendance.filter(l=>this.getMonthYear(l.date)===n).length);window.chartManager&&window.chartManager.drawLineChart("attendanceLineChart",{labels:e,datasets:[{label:"الحضور",data:a,color:"#4ade80"}]});const t=["active","inactive","on-leave","terminated"].map(n=>this.employees.filter(l=>l.status===n).length),s=["نشط","غير نشط","في إجازة","منتهي"];window.chartManager&&window.chartManager.drawPieChart("statusPieChart",[{label:s[0],value:t[0],color:"#4ade80"},{label:s[1],value:t[1],color:"#94a3b8"},{label:s[2],value:t[2],color:"#fbbf24"},{label:s[3],value:t[3],color:"#f87171"}]);const i=this.departments.map(n=>n.name),r=this.departments.map(n=>{const l=this.performance.filter(c=>c.departmentId===n.id);return l.length===0?0:Math.round(l.reduce((c,d)=>c+(d.score||0),0)/l.length)});window.chartManager&&window.chartManager.drawBarChart("performanceBarChart",{labels:i,datasets:[{label:"معدل الأداء",data:r,color:"#3b82f6"}]})}getLast12MonthsLabels(){const e=[],a=new Date;for(let t=11;t>=0;t--){const s=new Date(a.getFullYear(),a.getMonth()-t,1);e.push(`${s.getFullYear()}/${(s.getMonth()+1).toString().padStart(2,"0")}`)}return e}getMonthYear(e){if(!e)return"";const a=new Date(e);return`${a.getFullYear()}/${(a.getMonth()+1).toString().padStart(2,"0")}`}getFilteredData(e){let a=[...e];if(this.filters.status!=="all"&&(a=a.filter(t=>t.status===this.filters.status)),this.filters.department!=="all"&&(a=a.filter(t=>t.departmentId===parseInt(this.filters.department))),this.filters.position!=="all"&&(a=a.filter(t=>t.positionId===parseInt(this.filters.position))),this.filters.search){const t=this.filters.search.toLowerCase();a=a.filter(s=>s.name&&s.name.toLowerCase().includes(t)||s.employeeId&&s.employeeId.toLowerCase().includes(t)||s.email&&s.email.toLowerCase().includes(t)||s.departmentName&&s.departmentName.toLowerCase().includes(t)||s.positionName&&s.positionName.toLowerCase().includes(t)||s.phone&&s.phone.toLowerCase().includes(t))}return a}getPerformanceLevel(e){return e>=90?"excellent":e>=70?"good":e>=50?"fair":"poor"}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[e,a,t,s,i,r,n,l,c,d]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.employees||"/api/advanced-hr/employees"),this.apiClient.get(this.API_ENDPOINTS.departments||"/api/advanced-hr/departments"),this.apiClient.get(this.API_ENDPOINTS.positions||"/api/advanced-hr/positions"),this.apiClient.get(this.API_ENDPOINTS.leaves||"/api/advanced-hr/leaves"),this.apiClient.get(this.API_ENDPOINTS.attendance||"/api/advanced-hr/attendance"),this.apiClient.get(this.API_ENDPOINTS.performance||"/api/advanced-hr/performance"),this.apiClient.get(this.API_ENDPOINTS.recruitment||"/api/advanced-hr/recruitment"),this.apiClient.get(this.API_ENDPOINTS.training||"/api/advanced-hr/training"),this.apiClient.get(this.API_ENDPOINTS.payroll||"/api/advanced-hr/payroll"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-hr/analytics")]);this.employees=e.data||[],this.departments=a.data||[],this.positions=t.data||[],this.leaves=s.data||[],this.attendance=i.data||[],this.performance=r.data||[],this.recruitment=n.data||[],this.training=l.data||[],this.payroll=c.data||[],this.analytics=d.data||[],this.saveToLocalStorage(),this.updateContent()}catch(e){console.error("Error loading HR data:",e),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-hr","*",e=>{(e.action==="create"||e.action==="update"||e.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(e){this.currentView=e,this.updateContent()}handleFilterChange(e,a){this.filters[e]=a.target.value,this.updateContent()}handleSearch(e){this.filters.search=e.target.value,this.updateContent()}updateContent(){const e=document.getElementById("hrContent");e&&(e.innerHTML=this.renderCurrentView())}getStatusText(e){return{active:"نشط",inactive:"غير نشط","on-leave":"في إجازة",terminated:"منتهي",pending:"قيد الانتظار",approved:"موافق عليه",rejected:"مرفوض",completed:"مكتمل",paid:"مدفوع",unpaid:"غير مدفوع"}[e]||e}getLeaveTypeText(e){return{annual:"سنوية",sick:"مرضية",emergency:"طارئة",unpaid:"بدون راتب",maternity:"أمومة",paternity:"أبوة"}[e]||e}formatDate(e){return e?new Date(e).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedEmployees",JSON.stringify(this.employees)),localStorage.setItem("advancedDepartments",JSON.stringify(this.departments)),localStorage.setItem("advancedPositions",JSON.stringify(this.positions)),localStorage.setItem("advancedLeaves",JSON.stringify(this.leaves)),localStorage.setItem("advancedAttendance",JSON.stringify(this.attendance)),localStorage.setItem("advancedPerformance",JSON.stringify(this.performance)),localStorage.setItem("advancedRecruitment",JSON.stringify(this.recruitment)),localStorage.setItem("advancedTraining",JSON.stringify(this.training)),localStorage.setItem("advancedPayroll",JSON.stringify(this.payroll)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(e){console.error("Error saving to localStorage:",e)}}loadFromLocalStorage(){try{this.employees=JSON.parse(localStorage.getItem("advancedEmployees")||"[]"),this.departments=JSON.parse(localStorage.getItem("advancedDepartments")||"[]"),this.positions=JSON.parse(localStorage.getItem("advancedPositions")||"[]"),this.leaves=JSON.parse(localStorage.getItem("advancedLeaves")||"[]"),this.attendance=JSON.parse(localStorage.getItem("advancedAttendance")||"[]"),this.performance=JSON.parse(localStorage.getItem("advancedPerformance")||"[]"),this.recruitment=JSON.parse(localStorage.getItem("advancedRecruitment")||"[]"),this.training=JSON.parse(localStorage.getItem("advancedTraining")||"[]"),this.payroll=JSON.parse(localStorage.getItem("advancedPayroll")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(e){console.error("Error loading from localStorage:",e)}}setupEventListeners(){this.createEmployee=this.createEmployee.bind(this),this.createDepartment=this.createDepartment.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewEmployee=this.viewEmployee.bind(this),this.editEmployee=this.editEmployee.bind(this),this.viewDepartment=this.viewDepartment.bind(this),this.editDepartment=this.editDepartment.bind(this),this.approveLeave=this.approveLeave.bind(this),this.rejectLeave=this.rejectLeave.bind(this)}async createEmployee(){console.log("Create employee")}async createDepartment(){console.log("Create department")}async viewEmployee(e){console.log("View employee",e)}async editEmployee(e){console.log("Edit employee",e)}async viewDepartment(e){console.log("View department",e)}async editDepartment(e){console.log("Edit department",e)}async approveLeave(e){console.log("Approve leave",e)}async rejectLeave(e){console.log("Reject leave",e)}}window.AdvancedHRManagement=g;window.hrManager=window.hrManager||null;export{g as default};
//# sourceMappingURL=rehabilitation-center-advanced-hr-DrjdT1oP.js.map
