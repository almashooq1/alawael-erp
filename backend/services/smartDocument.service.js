/**
 * PHASE 111: Smart Document Generation & e-Signature Unit
 * Automates the creation of official letters using templates, variable data injection,
 * and electronic signature/sealing workflows.
 */

class SmartDocumentService {
  constructor() {
    console.log('System: Smart Document & e-Signature Unit - Initialized');

    // In-memory storage for this phase
    this.templates = new Map();
    this.documents = new Map();

    // Initialize with default smart templates
    this._seedTemplates();
  }

  // --- Template Management ---

  createTemplate(data) {
    const id = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const template = {
      id,
      name: data.name,
      type: data.type, // 'EMPLOYEE', 'STUDENT', 'TRAINEE'
      language: data.language || 'AR',
      body: data.body, // HTML with {{placeholders}}
      isActive: true,
      createdAt: new Date(),
    };
    this.templates.set(id, template);
    return template;
  }

  getTemplate(id) {
    return this.templates.get(id);
  }

  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  // --- Document Generation Workflow ---

  /**
   * Step 1: Generate Draft (Merge Data)
   */
  async generateDraft(templateId, personId, modifierData = {}) {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    // Simulate fetching person data based on Type
    // In real app, this calls Employee or Student DB models
    const personData = await this._fetchPersonData(template.type, personId);
    if (!personData) throw new Error('Person not found');

    // Merge Data: Combine DB data with any manual modifiers
    const mergeContext = { ...personData, ...modifierData, DATE: new Date().toLocaleDateString('ar-SA') };

    // Replace Placeholders
    let content = template.body;
    for (const [key, value] of Object.entries(mergeContext)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }

    const docId = `DOC-${Math.floor(Math.random() * 100000)}`;
    const document = {
      id: docId,
      templateId,
      personId,
      templateName: template.name,
      content, // Merged HTML
      status: 'DRAFT', // DRAFT -> PENDING_SIGNATURE -> SIGNED -> SEALED
      referenceNumber: `REF-${new Date().getFullYear()}-${docId}`,
      history: [{ action: 'CREATED', by: 'System', date: new Date() }],
    };

    this.documents.set(docId, document);
    return document;
  }

  /**
   * Step 2: Send for Signature
   */
  async requestSignature(docId, signerRole) {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document not found');

    doc.status = 'PENDING_SIGNATURE';
    doc.assignedSigner = signerRole; // e.g., 'MANAGER', 'HR_DIRECTOR'
    doc.history.push({ action: 'SENT_FOR_SIGNATURE', to: signerRole, date: new Date() });
    return doc;
  }

  /**
   * Step 3: Sign Document
   */
  async signDocument(docId, signerName, signatureToken) {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document not found');
    if (doc.status !== 'PENDING_SIGNATURE') throw new Error('Document is not awaiting signature');

    // "Digital Signature" Simulation
    doc.status = 'SIGNED';
    doc.signedBy = signerName;
    doc.signedDate = new Date();
    doc.signatureHash = `SIG_${Math.random().toString(36).substring(7).toUpperCase()}`; // Mock crypto hash

    // Append visual signature to content
    doc.content += `<br/><br/><div class='signature'><strong>Signed By:</strong> ${signerName}<br/><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>`;

    doc.history.push({ action: 'SIGNED', by: signerName, date: new Date() });

    // Auto-trigger sealing if configured
    return this.sealDocument(docId);
  }

  /**
   * Step 4: Apply Smart e-Seal
   */
  async sealDocument(docId) {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document from found');

    // Apply Official Seal
    doc.status = 'SEALED';
    doc.isLocked = true; // Immutable
    doc.sealId = `SEAL-${new Date().getTime()}`;

    // Append stamp to content
    doc.content += `<div class='seal' style='border: 3px double red; padding: 10px; color: red; display: inline-block; transform: rotate(-5deg); margin-top: 20px;'>
            <strong>OFFICIAL SEAL</strong><br/>
            ScaleHealth Center<br/>
            Ref: ${doc.referenceNumber}
        </div>`;

    doc.history.push({ action: 'SEALED', date: new Date() });

    // In a real system, we would generate a PDF buffer here
    doc.downloadUrl = `/api/documents-smart/download/${doc.id}.pdf`;

    return doc;
  }

  /**
   * PHASE 113: Public Verification
   */
  verifyDocument(referenceNumber) {
    const doc = Array.from(this.documents.values()).find(d => d.referenceNumber === referenceNumber);
    if (!doc) return { valid: false, message: 'Document not found' };
    if (doc.status !== 'SEALED') return { valid: false, message: 'Document exists but is not sealed/official.' };

    return {
      valid: true,
      referenceNumber: doc.referenceNumber,
      issuedTo: `Person ID: ${doc.personId}`,
      type: doc.templateName,
      status: doc.status,
      issuedDate: doc.history.find(h => h.action === 'SEALED')?.date,
      isAuthentic: true,
    };
  }

  getDocument(id) {
    return this.documents.get(id);
  }

  // --- Helpers ---

  async _fetchPersonData(type, id) {
    // Mock Data Source
    const db = {
      EMPLOYEE: {
        EMP001: {
          NAME: 'Ahmed Ali',
          ID_NUM: '1001',
          TITLE: 'Senior Nurse',
          DEPT: 'Nursing',
          SALARY: '15,000 SAR',
          JOIN_DATE: '2020-01-01',
        },
        EMP002: {
          NAME: 'Sarah Smith',
          ID_NUM: '1002',
          TITLE: 'Physiotherapist',
          DEPT: 'Rehab',
          SALARY: '18,500 SAR',
          JOIN_DATE: '2019-05-15',
        },
      },
      STUDENT: {
        STU500: { NAME: 'Omar Khalid', ID_NUM: '5005', PROGRAM: 'Clinical Psychology', UNIVERSITY: 'KSU', START_DATE: '2025-09-01' },
      },
      TRAINEE: {
        TRN900: { NAME: 'Mona Zaki', ID_NUM: '9009', SPECIALTY: 'Occupational Therapy', DURATION: '6 Months' },
      },
      PARENT: {
        PAR100: { NAME: 'Khalid Abdullah', CHILD_NAME: 'Omar Khalid', RELATION: 'Father', CONTACT: '0555555555' },
      },
      GOV: {
        GOV_MOH: { NAME: 'Ministry of Health', DEPT: 'Licensing', REGION: 'Riyadh' },
      },
      ADMIN: {
        ADM001: { NAME: 'Dr. Faisal', ROLE: 'Director', DEPT: 'Administration' },
      },
    };
    return db[type] ? db[type][id] : null;
  }

  _seedTemplates() {
    // --- EMPLOYEE TEMPLATES (PROFESSIONAL 2.0) ---

    // 1. Salary Certificate
    this.createTemplate({
      name: 'تعريف بالراتب (Salary Certificate)',
      type: 'EMPLOYEE',
      body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: right; direction: rtl; border: 2px solid #2c3e50; padding: 40px; max-width: 800px; margin: 0 auto; background: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px;">
                    <div><h2 style="color: #2c3e50;">ScaleHealth</h2></div>
                    <div style="text-align: left; color: #7f8c8d; font-size: 14px;">
                        <strong>Ref:</strong> {{REF_NO}}<br>
                        <strong>Date:</strong> {{DATE}}
                    </div>
                </div>

                <h1 style="text-align: center; color: #2c3e50; margin-bottom: 40px; text-decoration: underline;">شهادة تعريف بالراتب</h1>
                
                <p style="font-size: 16px; line-height: 1.8;">تشهد إدارة الموارد البشرية في <strong>ScaleHealth</strong> بأن الموظف الموضح بياناته أدناه يعمل لدينا ولا يزال على رأس العمل:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 16px;">
                    <tr>
                        <td style="padding: 12px; border: 1px solid #bdc3c7; background: #ecf0f1; font-weight: bold; width: 30%;">الاسم الرباعي</td>
                        <td style="padding: 12px; border: 1px solid #bdc3c7;">{{NAME}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #bdc3c7; background: #ecf0f1; font-weight: bold;">رقم الهوية / الإقامة</td>
                        <td style="padding: 12px; border: 1px solid #bdc3c7;">{{ID_NUM}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #bdc3c7; background: #ecf0f1; font-weight: bold;">المسمى الوظيفي</td>
                        <td style="padding: 12px; border: 1px solid #bdc3c7;">{{TITLE}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #bdc3c7; background: #ecf0f1; font-weight: bold;">القسم</td>
                        <td style="padding: 12px; border: 1px solid #bdc3c7;">{{DEPT}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #bdc3c7; background: #ecf0f1; font-weight: bold;">تاريخ الالتحاق</td>
                        <td style="padding: 12px; border: 1px solid #bdc3c7;">{{JOIN_DATE}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #bdc3c7; background: #ecf0f1; font-weight: bold;">الراتب الإجمالي</td>
                        <td style="padding: 12px; border: 1px solid #bdc3c7;"><strong>{{SALARY}}</strong></td>
                    </tr>
                </table>

                <p style="font-size: 16px; line-height: 1.8;">وقد أعطي هذا التعريف بناءً على طلبه لتقديمه لمن يهمه الأمر، دون أدنى مسؤولية مالية أو قانونية على المركز.</p>
                
                <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <p><strong>مدير الموارد البشرية</strong></p>
                        <p style="margin-top: 50px;">____________________</p>
                    </div>
                </div>

                <div style="margin-top: 50px; border-top: 1px solid #bdc3c7; padding-top: 10px; font-size: 12px; color: #7f8c8d; text-align: center;">
                    ScaleHealth Center - Riyadh, Saudi Arabia | Tel: +966 11 000 0000 | Email: hr@scalehealth.sa
                </div>
            </div>`,
    });

    // 2. End of Service Benefits
    this.createTemplate({
      name: 'تسوية مستحقات نهاية الخدمة (End of Service)',
      type: 'EMPLOYEE',
      body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: right; direction: rtl; border: 2px solid #e74c3c; padding: 40px; max-width: 800px; margin: 0 auto; background: #fff;">
                <h2 style="color: #c0392b; border-bottom: 2px solid #c0392b; padding-bottom: 10px;">نموذج مخالصة نهائية وتسوية مستحقات</h2>
                
                <p><strong>التاريخ:</strong> {{DATE}}</p>
                
                <p>أقر أنا الموقع أدناه، <strong>{{NAME}}</strong>، هوية رقم ({{ID_NUM}})، بأنني استلمت كامل مستحقاتي النظامية من شركة ScaleHealth عن فترة عملي التي انتهت في <strong>{{END_DATE}}</strong>.</p>
                
                <table style="width: 100%; border: 1px solid #ddd; margin: 20px 0;">
                    <tr style="background: #f9f9f9;">
                        <th style="padding: 10px; border: 1px solid #ddd;">البند</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">المبلغ (ريال سعودي)</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">مكافأة نهاية الخدمة</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{EOS_AMOUNT}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">بدل إجازات غير مستخدمة</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{VACATION_PAY}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>الإجمالي الصافي</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>{{TOTAL_AMOUNT}}</strong></td>
                    </tr>
                </table>

                <p>وبهذا أقر بأنه لا يحق لي المطالبة بأي حقوق مالية أو عمالية مستقبلاً.</p>
                
                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>الموظف:</strong> {{NAME}}</p>
                        <p>التوقيع: _________________</p>
                    </div>
                </div>
            </div>`,
    });

    // 3. Promotion Letter
    this.createTemplate({
      name: 'قرار ترقية (Promotion Letter)',
      type: 'EMPLOYEE',
      body: `
            <div style="font-family: 'Times New Roman', serif; text-align: center; direction: rtl; border: 5px double #27ae60; padding: 50px; max-width: 800px; margin: 0 auto; background: #fffdf9;">
                <h1 style="color: #27ae60; font-size: 36px; margin-bottom: 10px;">تهنئة وقرار ترقية</h1>
                <hr style="width: 50%; border: 1px solid #27ae60;">
                
                <p style="font-size: 18px; margin-top: 40px;">يسر إدارة الموارد البشرية أن تعلن عن ترقية الزميل/ة:</p>
                
                <h2 style="font-size: 28px; color: #34495e; margin: 10px 0;">{{NAME}}</h2>
                
                <p>إلى وظيفة:</p>
                <h2 style="font-size: 24px; color: #2980b9;">{{NEW_TITLE}}</h2>
                
                <p style="text-align: justify; margin: 30px 10%; line-height: 1.8;">
                    وذلك تقديراً لجهودكم المتميزة وكفاءتكم العالية خلال الفترة الماضية. يسري هذا القرار اعتباراً من {{EFFECTIVE_DATE}}، مع تمنياتنا لكم بدوام التوفيق والنجاح في مهامكم الجديدة.
                </p>
                
                <div style="margin-top: 60px;">
                    <p><strong>المدير التنفيذي</strong></p>
                    <p>___________________</p>
                </div>
            </div>`,
    });

    // 4. Leave Request Approval (Professional)
    this.createTemplate({
      name: 'قرار منح إجازة (Leave Approval)',
      type: 'EMPLOYEE',
      body: `
            <div style="text-align: right; direction: rtl; font-family: Tahoma; background: #fff; padding: 30px; border: 1px solid #ccc;">
                <table style="width: 100%; margin-bottom: 20px;">
                    <tr>
                        <td style="text-align: right;"><strong>Ref:</strong> HR-LEAVE-{{REF}}</td>
                        <td style="text-align: left;"><strong>Date:</strong> {{DATE}}</td>
                    </tr>
                </table>
                <h2 style="background: #eee; padding: 10px; text-align: center; border: 1px solid #999;">قرار إداري رقم ({{REF}})</h2>
                <p>إشارة إلى طلب الإجازة المقدم من الموظف: <strong>{{NAME}}</strong> ({{ID_NUM}})</p>
                
                <p>فقد تقرر الموافقة على منح إجازة وفق التفاصيل التالية:</p>
                <ul>
                    <li><strong>نوع الإجازة:</strong> سنوية</li>
                    <li><strong>المدة:</strong> {{DAYS}} أيام</li>
                    <li><strong>تبدأ من:</strong> {{START_DATE}}</li>
                    <li><strong>تنتهي في:</strong> {{END_DATE}}</li>
                    <li><strong>تاريخ المباشرة:</strong> {{RETURN_DATE}}</li>
                </ul>
                
                <p>الرصيد المتبقي بعد هذه الإجازة: <strong>{{BALANCE}}</strong> يوم.</p>
                
                <p style="margin-top: 30px;"><strong>مدير الموارد البشرية</strong></p>
            </div>`,
    });

    // 5. Experience Certificate
    this.createTemplate({
      name: 'شهادة خبرة (Experience Certificate)',
      type: 'EMPLOYEE',
      body: `
            <div style="text-align: right; direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; border: 2px solid #ccc;">
                <h2 style="text-align: center; margin-bottom: 40px;">شهادة خبرة</h2>
                <p>نفيدكم بأن السيد/ة <strong>{{NAME}}</strong> ({{ID_NUM}})</p>
                <p>قد عمل لدينا في وظيفة <strong>{{TITLE}}</strong> بقسم <strong>{{DEPT}}</strong>.</p>
                <p>وذلك للفترة من <strong>{{JOIN_DATE}}</strong> وحتى تاريخه.</p>
                <p>وقد كان مثالاً للانضباط والتميز في العمل.</p>
                <p style="margin-top: 40px;">التاريخ: {{DATE}}</p>
                <p><strong>المدير العام</strong></p>
            </div>`,
    });

    // 6. Warning Letter (Strict)
    this.createTemplate({
      name: 'إنذار إداري (Warning Letter)',
      type: 'EMPLOYEE',
      body: `
            <div style="text-align: right; direction: rtl; border: 3px solid red; padding: 20px; background: #fff0f0;">
                <h2 style="color: red; text-align: center;">إنذار إداري / Warning Letter</h2>
                <p><strong>إلى الموظف:</strong> {{NAME}}</p>
                <p><strong>الرقم الوظيفي:</strong> {{EMP_ID}}</p>
                
                <p>نظراً لما لوحظ عليكم من مخالفة للأنظمة واللوائح والمتمثلة في:</p>
                <div style="background: #fff; border: 1px solid red; padding: 15px; margin: 10px 0;">
                    <strong>{{VIOLATION}}</strong> بتاريخ {{VIOLATION_DATE}}
                </div>
                
                <p>فقد تقرر توجيه هذا الإنذار لكم، ونلفت نظركم إلى ضرورة الالتزام وعدم تكرار ذلك مستقبلاً لكي لا نضطر لاتخاذ إجراءات أشد وفقاً للائحة الجزاءات.</p>
                <p><strong>إدارة الموارد البشرية</strong></p>
            </div>`,
    });

    this.createTemplate({
      name: 'طلب سلفة (Loan Request)',
      type: 'EMPLOYEE',
      body: `
            <div style="text-align: right; direction: rtl; font-family: 'Segoe UI'; padding: 20px;">
                <h2>طلب سلفة على الراتب</h2>
                <p>أنا الموظف: <strong>{{NAME}}</strong>، أتقدم بطلب سلفة وقدرها <strong>{{AMOUNT}}</strong>.</p>
                <p>لسداد التزامات مالية، على أن يتم الخصم من الراتب الشهري ابتداءً من الشهر القادم.</p>
                <p>التاريخ: {{DATE}}</p>
                <div style="margin-top: 30px; border-top: 1px dashed black; padding-top: 10px;">
                    <p><strong>موافقة الإدارة المالية:</strong></p>
                    <p>المبلغ المعتمد: _____________</p>
                </div>
            </div>`,
    });

    // --- STUDENT TEMPLATES (Professional) ---

    // 1. Student Enrollment (Official with header)
    this.createTemplate({
      name: 'إثبات قيد طالب (Student Enrollment)',
      type: 'STUDENT',
      body: `
            <div style="font-family: Arial, sans-serif; text-align: right; direction: rtl; border-top: 5px solid #3498db; padding: 20px;">
                <h2 style="color: #2980b9;">شهادة إثبات قيد وتدريب</h2>
                <p>يفيد قسم التدريب والتعليم في <strong>ScaleHealth</strong> بأن الطالب/ة:</p>
                <h3 style="text-align: center; background: #eaf2f8; padding: 10px;">{{NAME}}</h3>
                <p>منتظم حالياً في التدريب العملي السريري ضمن متطلبات برنامج: <strong>{{PROGRAM}}</strong></p>
                <p>الجهة الأكاديمية: <strong>{{UNIVERSITY}}</strong>.</p>
                <p>وقد بدأ التدريب بتاريخ: {{START_DATE}} ومن المتوقع انتهاؤه بتاريخ {{EXPECTED_END_DATE}}.</p>
                <br>
                <p>وهذه شهادة بذلك لتقديمها لمن يهمه الأمر.</p>
                <p><strong>مدير التدريب والتعليم</strong></p>
            </div>`,
    });

    // 2. Internship Acceptance
    this.createTemplate({
      name: 'خطاب قبول تدريب (Internship Acceptance)',
      type: 'STUDENT',
      body: `
            <div style="text-align: right; direction: rtl; padding: 20px; font-family: 'Times New Roman';">
                 <div style="border-bottom: 2px solid #333; margin-bottom: 20px;">
                    <h2>القبول في برنامج الامتياز/التدريب</h2>
                 </div>
                 <p>المكرم/ة الطالب/ة: <strong>{{NAME}}</strong></p>
                 <p>السلام عليكم ورحمة الله وبركاته،</p>
                 <p>يسرنا إشعاركم بقبول طلبكم للانضمام لبرنامج التدريب في تخصص <strong>{{SPECIALTY}}</strong>.</p>
                 <p>يرجى مراجعة قسم الموارد البشرية لإنهاء إجراءات إصدار البطاقة وتوقيع اتفاقية السرية قبل موعد المباشرة المحدد في <strong>{{START_DATE}}</strong>.</p>
                 <br>
                 <p>نتمنى لكم تجربة تعليمية مثرية.</p>
                 <p><strong>ScaleHealth Academy</strong></p>
            </div>`,
    });

    this.createTemplate({
      name: 'طلب كشف درجات (Transcript Request)',
      type: 'STUDENT',
      body: `
            <div style="text-align: right; direction: rtl;">
                <h2>طلب كشف درجات/ساعات تدريبية</h2>
                <p>أرجو التكرم بتزويدي بكشف تفصيلي للساعات التدريبية التي أنجزتها.</p>
                <p>الاسم: <strong>{{NAME}}</strong></p>
                <p>البرنامج: <strong>{{PROGRAM}}</strong></p>
                <p>الجهة: <strong>{{UNIVERSITY}}</strong></p>
            </div>`,
    });

    this.createTemplate({
      name: 'عذر غياب (Absence Excuse)',
      type: 'STUDENT',
      body: `
            <div style="text-align: right; direction: rtl;">
                <h2>نموذج عذر غياب</h2>
                <p>أتقدم أنا الطالب <strong>{{NAME}}</strong> بعذر غياب ليوم <strong>{{ABSENCE_DATE}}</strong>.</p>
                <p>السبب: <strong>{{REASON}}</strong>.</p>
                <p>مرفق التقرير الطبي/المستندات.</p>
            </div>`,
    });

    // --- TRAINEE TEMPLATES (Professional) ---

    // 1. Training Completion (English)
    this.createTemplate({
      name: 'Training Completion Certificate',
      type: 'TRAINEE',
      language: 'EN',
      body: `
            <div style="text-align: center; direction: ltr; font-family: 'Georgia', serif; border: 10px solid #ddd; padding: 50px;">
                <h1 style="color: #2c3e50; font-size: 48px; margin-bottom: 10px;">Certificate of Completion</h1>
                <p style="font-size: 18px; color: #7f8c8d;">This is to certify that</p>
                
                <h2 style="font-size: 36px; color: #2980b9; margin: 20px 0;">{{NAME}}</h2>
                
                <p style="font-size: 18px;">Has successfully completed the Internship Program at ScaleHealth in</p>
                <h3 style="font-size: 24px; color: #2c3e50;">{{SPECIALTY}}</h3>
                
                <p style="margin-top: 30px;"><strong>Duration:</strong> {{DURATION}}</p>
                <p>We wish them success in their future endeavors.</p>
                
                <div style="margin-top: 60px; display: flex; justify-content: space-around;">
                    <div>
                        <hr style="width: 200px;">
                        <p>Mentorship Director</p>
                    </div>
                    <div>
                        <hr style="width: 200px;">
                        <p>CEO, ScaleHealth</p>
                    </div>
                </div>
            </div>`,
    });

    // --- PARENT TEMPLATES ---

    this.createTemplate({
      name: 'طلب اجتماع مع الإدارة (Meeting Request)',
      type: 'PARENT',
      body: `
            <div style="text-align: right; direction: rtl; font-family: Tahoma; border: 1px solid #ccc; padding: 20px;">
                <h2 style="color: #2c3e50;">طلب اجتماع</h2>
                <p>أنا ولي أمر الطالب: <strong>{{CHILD_NAME}}</strong></p>
                <p>الاسم: <strong>{{NAME}}</strong></p>
                <p>أرغب بطلب اجتماع مع <strong>{{TARGET_DEPT}}</strong> لمناقشة <strong>{{TOPIC}}</strong>.</p>
                <p>رقم التواصل: {{CONTACT}}</p>
            </div>`,
    });

    this.createTemplate({
      name: 'موافقة ولي أمر (Consent Form)',
      type: 'PARENT',
      body: `
            <div style="text-align: right; direction: rtl; font-family: Tahoma; border: 1px solid #ccc; padding: 20px;">
                <h2 style="color: #2c3e50;">نموذج موافقة ولي الأمر</h2>
                <p>أوافق أنا <strong>{{NAME}}</strong> بصفتي ولي أمر <strong>{{CHILD_NAME}}</strong></p>
                <p>على مشاركة ابني/ابنتي في <strong>{{ACTIVITY}}</strong> المزمع إقامتها بتاريخ {{ACTIVITY_DATE}}.</p>
                <p>أقر بالعلم والموافقة.</p>
                <p>التوقيع: _____________</p>
            </div>`,
    });

    // --- GOVERNMENT TEMPLATES ---

    this.createTemplate({
      name: 'خطاب رسمي (Official Correspondence)',
      type: 'GOV',
      body: `
            <div style="text-align: right; direction: rtl; padding: 50px;">
                <div style="margin-bottom: 50px;">
                    <h2>المملكة العربية السعودية</h2>
                    <h3>ScaleHealth</h3>
                </div>
                <p>الرقم: {{REF_NO}}</p>
                <p>التاريخ: {{DATE}}</p>
                <br>
                <p>إلى: <strong>{{DESTINATION}}</strong></p>
                <p>السلام عليكم ورحمة الله وبركاته،</p>
                <br>
                <p><strong>الموضوع: {{SUBJECT}}</strong></p>
                <p>نود إفادتكم بخصوص <strong>{{DETAILS}}</strong>... ونأمل التحق من البيانات المرفقة.</p>
                <br>
                <p>وتقبلوا فائق الاحترام.</p>
                <p>المدير العام</p>
            </div>`,
    });

    this.createTemplate({
      name: 'تقرير إحصائي (Statistical Report)',
      type: 'GOV',
      body: `
            <div style="text-align: right; direction: rtl; border: 1px solid black; padding: 20px;">
                <h2 style="text-align: center;">تقرير إحصائي شهري</h2>
                <p>موجه إلى: <strong>{{NAME}}</strong> - {{DEPT}}</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                        <td style="border: 1px solid black; padding: 5px;">عدد الحالات المستفيدة</td>
                        <td style="border: 1px solid black; padding: 5px;"><strong>{{CASES_COUNT}}</strong></td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid black; padding: 5px;">عدد الجلسات العلاجية</td>
                        <td style="border: 1px solid black; padding: 5px;"><strong>{{SESSIONS_COUNT}}</strong></td>
                    </tr>
                </table>
                <p>ملاحظات: {{NOTES}}</p>
                <p>التاريخ: {{DATE}}</p>
            </div>`,
    });

    // --- ADMINISTRATION TEMPLATES ---

    this.createTemplate({
      name: 'تعميم داخلي (Internal Circular)',
      type: 'ADMIN',
      body: `
            <div style="text-align: right; direction: rtl; border: 2px solid #000; padding: 20px;">
                <h1 style="text-align: center;">تعميم داخلي</h1>
                <p>رقم: {{CIRCULAR_NO}}</p>
                <p>إلى جميع موظفي أقسام: {{TARGET_DEPTS}}</p>
                <hr>
                <p style="font-size: 18px; font-weight: bold;">الموضوع: {{SUBJECT}}</p>
                <p>{{CONTENT}}</p>
                <p>نأمل من الجميع الالتزام بما ورد أعلاه للأهمية.</p>
                <br>
                <p>{{NAME}} - {{ROLE}}</p>
            </div>`,
    });

    this.createTemplate({
      name: 'محضر اجتماع (Meeting Minutes)',
      type: 'ADMIN',
      body: `
            <div style="text-align: right; direction: rtl;">
                <h2>محضر اجتماع</h2>
                <p>اجتمعنا نحن في قسم <strong>{{DEPT}}</strong> بتاريخ {{DATE}}.</p>
                <p>الحضور: {{ATTENDEES}}</p>
                <p><strong>أهم القرارات:</strong></p>
                <p>{{DECISIONS}}</p>
                <p>انتهى الاجتماع.</p>
                <p>مقرر الاجتماع: {{NAME}}</p>
            </div>`,
    });

    // --- MEDICAL/CLINICAL TEMPLATES ---

    // 1. Medical Report
    this.createTemplate({
      name: 'تقرير طبي (Medical Report)',
      type: 'MEDICAL',
      body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: right; direction: rtl; border: 1px solid #3498db; padding: 40px; background: #fbfbfb;">
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #3498db; padding-bottom: 20px;">
                    <div><h2 style="color: #2980b9;">ScaleHealth Medical Center</h2></div>
                    <div><p><strong>File No:</strong> {{FILE_NO}}</p><p><strong>Date:</strong> {{DATE}}</p></div>
                </div>

                <h1 style="text-align: center; margin-top: 30px; text-decoration: underline;">تقرير طبي / Medical Report</h1>

                <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">اسم المريض:</td>
                        <td style="padding: 10px; border-bottom: 1px dotted #ccc;">{{PATIENT_NAME}}</td>
                        <td style="padding: 10px; font-weight: bold;">العمر:</td>
                        <td style="padding: 10px; border-bottom: 1px dotted #ccc;">{{AGE}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">العيادة:</td>
                        <td style="padding: 10px; border-bottom: 1px dotted #ccc;">{{CLINIC}}</td>
                        <td style="padding: 10px; font-weight: bold;">الطبيب المعالج:</td>
                        <td style="padding: 10px; border-bottom: 1px dotted #ccc;">{{DOCTOR_NAME}}</td>
                    </tr>
                </table>

                <div style="margin-top: 30px;">
                    <h3>التشخيص / Diagnosis:</h3>
                    <p style="padding: 15px; background: #fff; border: 1px solid #ddd;">{{DIAGNOSIS}}</p>
                </div>

                <div style="margin-top: 20px;">
                    <h3>الخطة العلاجية / Treatment Plan:</h3>
                    <p style="padding: 15px; background: #fff; border: 1px solid #ddd;">{{TREATMENT}}</p>
                </div>

                <div style="margin-top: 20px;">
                    <h3>التوصيات / Recommendations:</h3>
                    <p>{{RECOMMENDATIONS}}</p>
                </div>

                <div style="margin-top: 50px; text-align: center;">
                    <p><strong>ختم وتوقيع الطبيب</strong></p>
                    <p>____________________</p>
                </div>
            </div>`,
    });

    // 2. Sick Leave
    this.createTemplate({
      name: 'إجازة مرضية (Sick Leave)',
      type: 'MEDICAL',
      body: `
            <div style="text-align: right; direction: rtl; border: 2px dashed #e74c3c; padding: 30px;">
                <h2 style="color: #c0392b; text-align: center;">تقرير إجازة مرضية</h2>
                <p>تشهد العيادة بأن المريض/ <strong>{{PATIENT_NAME}}</strong></p>
                <p>قد راجع العيادة بتاريخ: {{VISIT_DATE}}</p>
                <p>وبناءً على الكشف الطبي، يوصى بمنحه راحة مرضية لمدة:</p>
                <h3 style="text-align: center;">{{DAYS}} يوم/أيام</h3>
                <p>تبدأ من تاريخ: {{START_DATE}} وتنتهي بنهاية يوم: {{END_DATE}}.</p>
                <br>
                <p style="font-size: 12px; color: #7f8c8d;">تم إصدار هذا التقرير بناءً على الحالة الطبية، وأي كشط أو تعديل يلغيه.</p>
                <p><strong>الطبيب المعالج</strong></p>
            </div>`,
    });

    // --- FINANCIAL TEMPLATES ---

    // 1. Invoice
    this.createTemplate({
      name: 'فاتورة ضريبية (Tax Invoice)',
      type: 'FINANCE',
      body: `
            <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px; border: 1px solid #ccc;">
                <div style="display: flex; justify-content: space-between;">
                    <h3>فاتورة ضريبية / Tax Invoice</h3>
                    <h3>#INV-{{INV_NO}}</h3>
                </div>
                <hr>
                <p><strong>العميل:</strong> {{CUSTOMER_NAME}}</p>
                <p><strong>الرقم الضريبي:</strong> {{TAX_NO}}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center;">
                    <tr style="background: #eee;">
                        <th style="border: 1px solid #999; padding: 8px;">الوصف</th>
                        <th style="border: 1px solid #999; padding: 8px;">الكمية</th>
                        <th style="border: 1px solid #999; padding: 8px;">السعر</th>
                        <th style="border: 1px solid #999; padding: 8px;">المجموع</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #999; padding: 8px;">{{ITEM_DESC}}</td>
                        <td style="border: 1px solid #999; padding: 8px;">{{QTY}}</td>
                        <td style="border: 1px solid #999; padding: 8px;">{{PRICE}}</td>
                        <td style="border: 1px solid #999; padding: 8px;">{{TOTAL}}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: left; padding: 8px; border: 1px solid #999;"><strong>الإجمالي قبل الضريبة</strong></td>
                        <td style="border: 1px solid #999;">{{SUBTOTAL}}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: left; padding: 8px; border: 1px solid #999;"><strong>ضريبة (15%)</strong></td>
                        <td style="border: 1px solid #999;">{{VAT}}</td>
                    </tr>
                    <tr style="background: #2c3e50; color: white;">
                        <td colspan="3" style="text-align: left; padding: 8px; border: 1px solid #999;"><strong>الإجمالي النهائي</strong></td>
                        <td style="border: 1px solid #999;"><strong>{{GRAND_TOTAL}}</strong></td>
                    </tr>
                </table>
            </div>`,
    });

    // --- ADDITIONAL HR ---

    this.createTemplate({
      name: 'خطاب قبول استقالة (Resignation Acceptance)',
      type: 'EMPLOYEE',
      body: `
            <div style="text-align: right; direction: rtl; padding: 40px; font-family: 'Segoe UI';">
                <h2>قبول استقالة</h2>
                <p>المكرم/ {{NAME}}،</p>
                <p>إشارة إلى خطاب الاستقالة المقدم منكم بتاريخ {{SUBMIT_DATE}}.</p>
                <p>نفيدكم بقبول الاستقالة، على أن يكون آخر يوم عمل لكم هو بتاريخ <strong>{{R_LAST_DAY}}</strong>.</p>
                <p>نشكر لكم جهودكم خلال فترة عملكم معنا، ونتمنى لكم التوفيق.</p>
                <br>
                <p><strong>إدارة الموارد البشرية</strong></p>
            </div>`,
    });

    // --- ADDITIONAL STUDENT ---

    this.createTemplate({
      name: 'خطاب توصية (Recommendation Letter)',
      type: 'STUDENT',
      language: 'EN',
      body: `
            <div style="text-align: left; direction: ltr; font-family: 'Times New Roman'; padding: 40px;">
                <h2>Letter of Recommendation</h2>
                <p><strong>To Whom It May Concern,</strong></p>
                <br>
                <p>It is my pleasure to recommend <strong>{{NAME}}</strong>, who completed their internship in <strong>{{DEPT}}</strong> under my supervision.</p>
                <p>During their time with us, they demonstrated exceptional {{SKILL_1}} and {{SKILL_2}} skills.</p>
                <p>I am confident that they will be a valuable asset to any organization.</p>
                <br>
                <p>Sincerely,</p>
                <p><strong>{{SUPERVISOR_NAME}}</strong></p>
                <p>{{SUPERVISOR_TITLE}}</p>
            </div>`,
    });

    // --- LEGAL & CONTRACTS ---

    // 1. NDA
    this.createTemplate({
      name: 'اتفاقية عدم إفصاح (NDA)',
      type: 'LEGAL',
      body: `
            <div style="padding: 40px; font-family: 'Segoe UI', serif; border: 2px double #000; direction: rtl; text-align: justify;">
                <h2 style="text-align: center;">اتفاقية عدم إفصاح (NDA)</h2>
                <p>إنه في يوم <strong>{{DAY}}</strong> الموافق <strong>{{DATE}}</strong>، تم الاتفاق بين كل من:</p>
                <p><strong>الطرف الأول:</strong> المؤسسة (المالك للمعلومات)</p>
                <p><strong>الطرف الثاني:</strong> {{SECOND_PARTY_NAME}} (المتلقي)</p>
                <p>يلتزم الطرف الثاني بالحفاظ على سرية المعلومات المستلمة من الطرف الأول وعدم الإفصاح عنها لأي طرف ثالث دون موافقة كتابية مسبقة.</p>
                <p>مدة هذه الاتفاقية سارية لمدة <strong>{{DURATION}}</strong> سنوات من تاريخ التوقيع.</p>
                <br>
                <table style="width: 100%; margin-top: 30px;">
                    <tr>
                        <td><strong>توقيع الطرف الأول:</strong> _________</td>
                        <td><strong>توقيع الطرف الثاني:</strong> _________</td>
                    </tr>
                </table>
            </div>`,
    });

    // 2. Legal Consultation
    this.createTemplate({
      name: 'طلب استشارة قانونية (Legal Consultation)',
      type: 'LEGAL',
      body: `
            <div style="font-family: 'Segoe UI'; direction: rtl; padding: 20px;">
                <h3 style="border-bottom: 2px solid #333; padding-bottom: 10px;">نموذج طلب استشارة قانونية</h3>
                <p><strong>القسم الطالب:</strong> {{DEPT_NAME}}</p>
                <p><strong>الموضوع:</strong> {{SUBJECT}}</p>
                <hr style="border: 0; border-top: 1px dashed #ccc;">
                <p><strong>تفاصيل الموضوع:</strong></p>
                <p style="background: #f9f9f9; padding: 10px; border: 1px solid #ddd; min-height: 100px;">{{DETAILS}}</p>
                <p><strong>الوثائق المرفقة:</strong> {{ATTACHMENTS}}</p>
                <br>
                <p><strong>مدير الإدارة:</strong> {{MANAGER_NAME}}</p>
            </div>`,
    });

    // --- PROCUREMENT & SUPPLY CHAIN ---

    // 1. Purchase Order (PO)
    this.createTemplate({
      name: 'أمر شراء (Purchase Order)',
      type: 'PROCUREMENT',
      body: `
            <div style="font-family: Arial; padding: 20px; direction: rtl;">
                <div style="background: #eee; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <h2>أمر شراء / PO</h2>
                    <h3>PO #: {{PO_NUMBER}}</h3>
                </div>
                <div style="margin-top: 20px;">
                    <p><strong>إلى المورد:</strong> {{VENDOR_NAME}}</p>
                    <p><strong>تاريخ الطلب:</strong> {{ORDER_DATE}}</p>
                    <p><strong>شروط الدفع:</strong> {{PAYMENT_TERMS}}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center;">
                    <thead>
                        <tr style="background: #333; color: white;">
                            <th style="padding: 10px;">المادة (Item)</th>
                            <th style="padding: 10px;">الكمية (Qty)</th>
                            <th style="padding: 10px;">سعر الوحدة (Unit Price)</th>
                            <th style="padding: 10px;">الإجمالي (Total)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{ITEM_NAME}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{QTY}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{UNIT_PRICE}}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{{LINE_TOTAL}}</td>
                        </tr>
                    </tbody>
                </table>
                <div style="margin-top: 20px; text-align: left; padding-left: 20px;">
                    <h3>المجموع الكلي: {{GRAND_TOTAL}} ريال</h3>
                </div>
                <div style="margin-top: 40px; border-top: 2px solid #000; padding-top: 10px;">
                    <p><strong>المدير المالي:</strong> _____________ &nbsp;&nbsp;&nbsp; <strong>مدير المشتريات:</strong> _____________</p>
                </div>
            </div>`,
    });

    // 2. Vendor Registration
    this.createTemplate({
      name: 'تسجيل مورد (Vendor Registration)',
      type: 'PROCUREMENT',
      body: `
            <div style="font-family: 'Segoe UI'; direction: rtl; padding: 30px;">
                <h2 style="text-align: center; color: #2c3e50;">نموذج تسجيل مورد جديد</h2>
                <table style="width: 100%; border: 1px solid #ccc; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc; width: 30%;">اسم الشركة</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">{{COMPANY_NAME}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc;">السجل التجاري</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">{{CR_NUMBER}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc;">الرقم الضريبي</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">{{TAX_NUMBER}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc;">تفاصيل البنك</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">{{BANK_DETAILS}}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; font-size: 12px; color: #777;">نقر بصحة البيانات أعلاه.</p>
                <p><strong>التوقيع والختم:</strong></p>
            </div>`,
    });

    // --- IT & TECHNICAL SUPPORT ---

    // 1. Access Request
    this.createTemplate({
      name: 'طلب صلاحيات نظام (System Access)',
      type: 'IT',
      body: `
            <div style="font-family: Consolas, 'Courier New', monospace; direction: rtl; padding: 20px; border: 1px solid #000;">
                <h3>IT SECURITY - ACCESS CONTROL FORM</h3>
                <p><strong>Employee Name:</strong> {{EMP_NAME}}</p>
                <p><strong>ID:</strong> {{EMP_ID}}</p>
                <p><strong>Department:</strong> {{DEPT}}</p>
                <hr>
                <p><strong>Requested Systems:</strong></p>
                <ul style="list-style-type: square;">
                    <li>[ ] ERP System</li>
                    <li>[ ] HR Portal</li>
                    <li>[ ] Email Service</li>
                    <li>[ ] VPN Access</li>
                </ul>
                <p><strong>Justification:</strong> {{REASON}}</p>
                <br>
                <p><strong>Approved by Manager:</strong> {{MANAGER_SIGN}}</p>
                <p><strong>IT Security Officer:</strong> {{IT_SIGN}}</p>
            </div>`,
    });

    // 2. Equipment Handover
    this.createTemplate({
      name: 'محضر تسليم عهدة (Equipment Handover)',
      type: 'IT',
      body: `
            <div style="font-family: 'Segoe UI'; direction: rtl; padding: 25px;">
                <h2 style="text-align: center; border-bottom: 2px solid #555;">محضر استلام عهدة تقنية</h2>
                <p>أقر أنا الموقع أدناه باستلام الأجهزة التالية بحالة جيدة، وأتحمل مسؤولية المحافظة عليها.</p>
                <table style="width: 100%; border: 1px solid #000; margin-top: 20px;">
                    <tr style="background: #ddd;">
                        <th style="padding: 8px; border: 1px solid #000;">نوع الجهاز</th>
                        <th style="padding: 8px; border: 1px solid #000;">الموديل</th>
                        <th style="padding: 8px; border: 1px solid #000;">الرقم التسلسلي (S/N)</th>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #000;">{{DEVICE_TYPE}}</td>
                        <td style="padding: 8px; border: 1px solid #000;">{{MODEL}}</td>
                        <td style="padding: 8px; border: 1px solid #000;">{{SERIAL_NO}}</td>
                    </tr>
                </table>
                <br>
                <p><strong>المستلم:</strong> {{RECEIVER_NAME}}</p>
                <p><strong>التاريخ:</strong> {{DATE}}</p>
                <p><strong>التوقيع:</strong> _________________</p>
            </div>`,
    });

    // --- FACILITY & SECURITY ---

    // 1. Maintenance Request
    this.createTemplate({
      name: 'طلب صيانة (Maintenance Request)',
      type: 'FACILITY',
      body: `
            <div style="font-family: Arial; direction: rtl; padding: 20px; border: 4px solid orange;">
                <h2 style="text-align: center; color: orange;">طلب صيانة عاجل</h2>
                <p><strong>الموقع/المكتب:</strong> {{LOCATION}}</p>
                <p><strong>نوع الصيانة:</strong> ( تكييف / كهرباء / سباكة / أثاث )</p>
                <p><strong>وصف المشكلة:</strong></p>
                <p style="border: 1px dashed #000; padding: 10px;">{{ISSUE_DESC}}</p>
                <p><strong>درجة الأهمية:</strong> {{PRIORITY}}</p>
                <br>
                <p><strong>تاريخ التقديم:</strong> {{SUBMIT_DATE}}</p>
            </div>`,
    });

    // 2. Incident Report
    this.createTemplate({
      name: 'تقرير حادثة (Incident Report)',
      type: 'FACILITY',
      body: `
            <div style="font-family: 'Segoe UI'; direction: rtl; padding: 30px;">
                <h2 style="color: red;">تقرير حادثة أمنية / سلامة</h2>
                <p><strong>وقت الحادثة:</strong> {{TIME}}</p>
                <p><strong>مكان الحادثة:</strong> {{LOCATION}}</p>
                <p><strong>الأشخاص المعنيين:</strong> {{PEOPLE_INVOLVED}}</p>
                <hr>
                <h3>تفاصيل الواقعة:</h3>
                <p>{{INCIDENT_DETAILS}}</p>
                <hr>
                <h3>الإجراء المتخذ:</h3>
                <p>{{ACTION_TAKEN}}</p>
                <br>
                <p><strong>مسؤول السلامة:</strong> {{SAFETY_OFFICER}}</p>
            </div>`,
    });

    // --- TRANSPORT & FLEET ---

    // 1. Vehicle Request
    this.createTemplate({
      name: 'طلب مركبة (Vehicle Request)',
      type: 'TRANSPORT',
      body: `
            <div style="font-family: Arial; direction: rtl; padding: 20px; border: 1px solid #333;">
                <h2 style="text-align: center;">نموذج حجز مركبة</h2>
                <p><strong>مقدم الطلب:</strong> {{APPLICANT_NAME}}</p>
                <p><strong>القسم:</strong> {{DEPT_NAME}}</p>
                <table style="width: 100%; margin-top: 15px; border-collapse: collapse;">
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9;">وجهة الرحلة</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">{{DESTINATION}}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9;">تاريخ الخروج</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">{{EXIT_DATE}}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9;">وقت العودة المتوقع</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">{{RETURN_TIME}}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px; background: #f9f9f9;">السبب</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">{{REASON}}</td>
                    </tr>
                </table>
                <br>
                <p><strong>اعتماد المدير المباشر:</strong> _________________</p>
                <p><strong>موافقة الحركة:</strong> _________________</p>
            </div>`,
    });

    // --- HOUSING & ACCOMMODATION ---

    // 1. Housing Check-In
    this.createTemplate({
      name: 'محضر استلام سكن (Housing Check-In)',
      type: 'HOUSING',
      body: `
            <div style="font-family: 'Segoe UI'; direction: rtl; padding: 30px;">
                <h2 style="text-align: center; color: #2c3e50;">نموذج استلام وحدة سكنية</h2>
                <p><strong>اسم الموظف:</strong> {{EMP_NAME}}</p>
                <p><strong>رقم الوحدة:</strong> {{UNIT_NO}} &nbsp; | &nbsp; <strong>المبنى:</strong> {{BUILDING}}</p>
                <p><strong>تاريخ الاستلام:</strong> {{CHECKIN_DATE}}</p>
                <hr>
                <h4>قائمة محتويات الوحدة وحالتها:</h4>
                <table style="width: 100%; border: 1px solid #999; border-collapse: collapse; text-align: center;">
                    <tr style="background: #ddd;">
                        <th style="border: 1px solid #999; padding: 5px;">الغرفة</th>
                        <th style="border: 1px solid #999; padding: 5px;">الأثاث</th>
                        <th style="border: 1px solid #999; padding: 5px;">الحالة (جيد/معيوب)</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #999; padding: 5px;">{{ROOM_1}}</td>
                        <td style="border: 1px solid #999; padding: 5px;">{{ITEM_1}}</td>
                        <td style="border: 1px solid #999; padding: 5px;">{{STATUS_1}}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #999; padding: 5px;">{{ROOM_2}}</td>
                        <td style="border: 1px solid #999; padding: 5px;">{{ITEM_2}}</td>
                        <td style="border: 1px solid #999; padding: 5px;">{{STATUS_2}}</td>
                    </tr>
                </table>
                <p><strong>ملاحظات:</strong> {{NOTES}}</p>
                <br>
                <p><strong>توقيع الساكن:</strong> ___________ &nbsp; <strong>مشرف السكن:</strong> ___________</p>
            </div>`,
    });

    // --- MARKETING & EVENTS ---

    // 1. Event Proposal
    this.createTemplate({
      name: 'مقترح فعالية (Event Proposal)',
      type: 'MARKETING',
      body: `
            <div style="font-family: 'Segoe UI'; direction: rtl; padding: 25px; border-right: 5px solid #E91E63;">
                <h2 style="color: #E91E63;">نموذج مقترح فعالية / نشاط</h2>
                <p><strong>اسم الفعالية:</strong> {{EVENT_NAME}}</p>
                <p><strong>التاريخ المقترح:</strong> {{PROPOSED_DATE}}</p>
                <p><strong>المكان:</strong> {{VENUE}}</p>
                <hr>
                <h3>الأهداف (Objectives):</h3>
                <p>{{OBJECTIVES}}</p>
                <h3>الفئة المستهدفة (Target Audience):</h3>
                <p>{{AUDIENCE}}</p>
                <h3>الميزانية التقديرية (Estimated Budget):</h3>
                <p style="font-size: 1.2em; font-weight: bold;">{{BUDGET}} ريال</p>
                <br>
                <p><strong>مقدم المقترح:</strong> {{SUBMITTER}}</p>
            </div>`,
    });

    // --- QUALITY & ACCREDITATION (ISO/JCI) ---

    // 1. Non-Conformance Report (NCR)
    this.createTemplate({
      name: 'تقرير عدم مطابقة (NCR)',
      type: 'QUALITY',
      body: `
            <div style="font-family: Arial; direction: rtl; padding: 20px; border: 2px solid #000;">
                <div style="display: flex; justify-content: space-between;">
                    <h3>تقرير عدم مطابقة (Non-Conformance Report)</h3>
                    <h3>NCR #: {{NCR_NO}}</h3>
                </div>
                <hr>
                <p><strong>القسم المعني:</strong> {{DEPT}}</p>
                <p><strong>تاريخ الاكتشاف:</strong> {{DETECT_DATE}}</p>
                <p><strong>المعيار المرجعي (Standard Ref):</strong> {{STANDARD_REF}}</p>
                
                <h4 style="background: #eee; padding: 5px;">وصف حالة عدم المطابقة (Description):</h4>
                <p style="border: 1px solid #ccc; padding: 10px; min-height: 80px;">{{DESCRIPTION}}</p>

                <h4 style="background: #eee; padding: 5px;">السبب الجذري (Root Cause):</h4>
                <p style="border: 1px solid #ccc; padding: 10px; min-height: 60px;">{{ROOT_CAUSE}}</p>

                <h4 style="background: #eee; padding: 5px;">الإجراء التصحيحي (Correction Action):</h4>
                <p style="border: 1px solid #ccc; padding: 10px; min-height: 60px;">{{ACTION}}</p>

                <div style="margin-top: 20px;">
                    <p><strong>مدير الجودة:</strong> ______________ &nbsp; <strong>تاريخ الإغلاق:</strong> __/__/____</p>
                </div>
            </div>`,
    });
  }
}

module.exports = SmartDocumentService;
