// Communications API Routes
// Provides endpoints for managing administrative communications

const express = require('express');
const router = express.Router();

// In-memory storage (temporary - replace with database later)
let communications = [
  {
    id: 1,
    type: 'incoming',
    priority: 'high',
    subject: 'طلب اجتماع عاجل',
    content: 'يرجى حضور اجتماع طارئ غداً الساعة 10 صباحاً',
    sender: 'أحمد محمد',
    senderEmail: 'ahmed@example.com',
    recipient: 'إدارة الموارد البشرية',
    department: 'الموارد البشرية',
    status: 'unread',
    referenceNumber: 'COM-2026-001',
    createdAt: new Date('2026-01-19T08:00:00').toISOString(),
    dueDate: new Date('2026-01-20T10:00:00').toISOString(),
    tags: ['عاجل', 'اجتماع'],
    attachments: [],
    starred: false,
    archived: false
  },
  {
    id: 2,
    type: 'outgoing',
    priority: 'normal',
    subject: 'تقرير الأداء الشهري',
    content: 'إليكم تقرير الأداء لشهر يناير 2026',
    sender: 'إدارة الموارد البشرية',
    senderEmail: 'hr@example.com',
    recipient: 'الإدارة العليا',
    department: 'الإدارة',
    status: 'sent',
    referenceNumber: 'COM-2026-002',
    createdAt: new Date('2026-01-18T14:30:00').toISOString(),
    dueDate: null,
    tags: ['تقرير', 'شهري'],
    attachments: ['performance_report_jan.pdf'],
    starred: true,
    archived: false
  },
  {
    id: 3,
    type: 'internal',
    priority: 'urgent',
    subject: 'تحديث سياسة العمل عن بعد',
    content: 'تم تحديث سياسة العمل عن بعد. يرجى الاطلاع على المرفقات',
    sender: 'إدارة الموارد البشرية',
    senderEmail: 'hr@example.com',
    recipient: 'جميع الموظفين',
    department: 'الموارد البشرية',
    status: 'read',
    referenceNumber: 'COM-2026-003',
    createdAt: new Date('2026-01-17T11:00:00').toISOString(),
    dueDate: new Date('2026-01-22T17:00:00').toISOString(),
    tags: ['سياسة', 'مهم'],
    attachments: ['remote_work_policy.pdf'],
    starred: false,
    archived: false
  }
];

let nextId = 4;

// Statistics data
const getStats = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    total: communications.length,
    unread: communications.filter(c => c.status === 'unread').length,
    pending: communications.filter(c => c.status === 'pending').length,
    today: communications.filter(c => c.createdAt.split('T')[0] === today).length,
    starred: communications.filter(c => c.starred).length,
    archived: communications.filter(c => c.archived).length
  };
};

// GET /api/communications - Get all communications
router.get('/', (req, res) => {
  try {
    const { type, status, priority, archived, starred, search } = req.query;
    
    let filtered = [...communications];
    
    // Filter by archived status
    if (archived !== undefined) {
      filtered = filtered.filter(c => c.archived === (archived === 'true'));
    }
    
    // Filter by type
    if (type && type !== 'all') {
      filtered = filtered.filter(c => c.type === type);
    }
    
    // Filter by status
    if (status && status !== 'all') {
      filtered = filtered.filter(c => c.status === status);
    }
    
    // Filter by priority
    if (priority && priority !== 'all') {
      filtered = filtered.filter(c => c.priority === priority);
    }
    
    // Filter by starred
    if (starred === 'true') {
      filtered = filtered.filter(c => c.starred === true);
    }
    
    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.subject.toLowerCase().includes(searchLower) ||
        c.content.toLowerCase().includes(searchLower) ||
        c.sender.toLowerCase().includes(searchLower) ||
        c.recipient.toLowerCase().includes(searchLower) ||
        c.referenceNumber.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      data: filtered,
      stats: getStats()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المراسلات',
      error: error.message
    });
  }
});

// GET /api/communications/stats - Get statistics
router.get('/stats', (req, res) => {
  try {
    res.json({
      success: true,
      data: getStats()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// GET /api/communications/:id - Get single communication
router.get('/:id', (req, res) => {
  try {
    const comm = communications.find(c => c.id === parseInt(req.params.id));
    
    if (!comm) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة'
      });
    }
    
    res.json({
      success: true,
      data: comm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المراسلة',
      error: error.message
    });
  }
});

// POST /api/communications - Create new communication
router.post('/', (req, res) => {
  try {
    const newComm = {
      id: nextId++,
      type: req.body.type || 'internal',
      priority: req.body.priority || 'normal',
      subject: req.body.subject,
      content: req.body.content,
      sender: req.body.sender,
      senderEmail: req.body.senderEmail,
      recipient: req.body.recipient,
      department: req.body.department,
      status: 'pending',
      referenceNumber: `COM-2026-${String(nextId - 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      dueDate: req.body.dueDate || null,
      tags: req.body.tags || [],
      attachments: req.body.attachments || [],
      starred: false,
      archived: false
    };
    
    communications.push(newComm);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المراسلة بنجاح',
      data: newComm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المراسلة',
      error: error.message
    });
  }
});

// PUT /api/communications/:id - Update communication
router.put('/:id', (req, res) => {
  try {
    const index = communications.findIndex(c => c.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة'
      });
    }
    
    communications[index] = {
      ...communications[index],
      ...req.body,
      id: communications[index].id, // Preserve ID
      referenceNumber: communications[index].referenceNumber, // Preserve reference
      createdAt: communications[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'تم تحديث المراسلة بنجاح',
      data: communications[index]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المراسلة',
      error: error.message
    });
  }
});

// DELETE /api/communications/:id - Delete communication
router.delete('/:id', (req, res) => {
  try {
    const index = communications.findIndex(c => c.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة'
      });
    }
    
    const deleted = communications.splice(index, 1)[0];
    
    res.json({
      success: true,
      message: 'تم حذف المراسلة بنجاح',
      data: deleted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المراسلة',
      error: error.message
    });
  }
});

// POST /api/communications/:id/star - Toggle star
router.post('/:id/star', (req, res) => {
  try {
    const comm = communications.find(c => c.id === parseInt(req.params.id));
    
    if (!comm) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة'
      });
    }
    
    comm.starred = !comm.starred;
    
    res.json({
      success: true,
      message: comm.starred ? 'تم إضافة المراسلة للمفضلة' : 'تم إزالة المراسلة من المفضلة',
      data: comm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المفضلة',
      error: error.message
    });
  }
});

// POST /api/communications/:id/archive - Toggle archive
router.post('/:id/archive', (req, res) => {
  try {
    const comm = communications.find(c => c.id === parseInt(req.params.id));
    
    if (!comm) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة'
      });
    }
    
    comm.archived = !comm.archived;
    comm.archivedAt = comm.archived ? new Date().toISOString() : null;
    
    res.json({
      success: true,
      message: comm.archived ? 'تم أرشفة المراسلة' : 'تم استرجاع المراسلة من الأرشيف',
      data: comm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الأرشفة',
      error: error.message
    });
  }
});

// GET /api/communications/:id/tracking - Get tracking info
router.get('/:id/tracking', (req, res) => {
  try {
    const comm = communications.find(c => c.id === parseInt(req.params.id));
    
    if (!comm) {
      return res.status(404).json({
        success: false,
        message: 'المراسلة غير موجودة'
      });
    }
    
    const trackingInfo = {
      referenceNumber: comm.referenceNumber,
      createdAt: comm.createdAt,
      creator: comm.sender,
      department: comm.department,
      viewCount: 0, // TODO: Implement view tracking
      processingDays: Math.floor((new Date() - new Date(comm.createdAt)) / (1000 * 60 * 60 * 24)),
      history: [
        {
          action: 'created',
          user: comm.sender,
          timestamp: comm.createdAt,
          details: 'تم إنشاء المراسلة'
        }
      ]
    };
    
    res.json({
      success: true,
      data: trackingInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معلومات التتبع',
      error: error.message
    });
  }
});

module.exports = router;

