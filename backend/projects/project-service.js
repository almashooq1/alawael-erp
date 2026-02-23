/**
 * Project Management Service - خدمة إدارة المشاريع
 * Comprehensive Project & Task Management System
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Project Configuration
 */
const projectConfig = {
  // Project statuses
  statuses: {
    draft: { label: 'مسودة', color: 'gray', order: 1 },
    planned: { label: 'مخطط', color: 'blue', order: 2 },
    active: { label: 'نشط', color: 'green', order: 3 },
    on_hold: { label: 'معلق', color: 'yellow', order: 4 },
    completed: { label: 'مكتمل', color: 'purple', order: 5 },
    cancelled: { label: 'ملغي', color: 'red', order: 6 },
  },
  
  // Task priorities
  priorities: {
    critical: { label: 'حرج', color: 'red', weight: 5 },
    high: { label: 'عالي', color: 'orange', weight: 4 },
    medium: { label: 'متوسط', color: 'yellow', weight: 3 },
    low: { label: 'منخفض', color: 'green', weight: 2 },
    trivial: { label: 'بسيط', color: 'gray', weight: 1 },
  },
  
  // Task statuses
  taskStatuses: {
    todo: { label: 'قيد الانتظار', order: 1 },
    in_progress: { label: 'قيد التنفيذ', order: 2 },
    review: { label: 'قيد المراجعة', order: 3 },
    done: { label: 'مكتمل', order: 4 },
    blocked: { label: 'محظور', order: 5 },
  },
  
  // Project types
  types: {
    internal: 'داخلي',
    client: 'للعميل',
    maintenance: 'صيانة',
    research: 'بحث وتطوير',
    infrastructure: 'بنية تحتية',
  },
};

/**
 * Project Schema
 */
const ProjectSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  code: { type: String, unique: true, sparse: true },
  description: String,
  
  // Type and status
  type: { type: String, enum: Object.keys(projectConfig.types), default: 'internal' },
  status: { type: String, enum: Object.keys(projectConfig.statuses), default: 'draft' },
  
  // Client (if applicable)
  client: {
    id: String,
    name: String,
    contact: String,
  },
  
  // Dates
  timeline: {
    startDate: Date,
    endDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
  },
  
  // Budget
  budget: {
    estimated: Number,
    actual: Number,
    currency: { type: String, default: 'SAR' },
  },
  
  // Progress
  progress: {
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksTotal: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  
  // Team
  team: {
    manager: {
      userId: String,
      name: String,
      email: String,
    },
    members: [{
      userId: String,
      name: String,
      role: String,
      allocation: Number, // percentage
      joinedAt: Date,
    }],
    stakeholders: [{
      userId: String,
      name: String,
      role: String,
    }],
  },
  
  // Department/Branch
  department: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  // Tags
  tags: [String],
  
  // Attachments
  attachments: [{
    name: String,
    filePath: String,
    uploadedBy: String,
    uploadedAt: Date,
  }],
  
  // Risks
  risks: [{
    title: String,
    description: String,
    probability: { type: String, enum: ['low', 'medium', 'high'] },
    impact: { type: String, enum: ['low', 'medium', 'high'] },
    mitigation: String,
    status: { type: String, enum: ['open', 'mitigated', 'closed'] },
    owner: String,
  }],
  
  // Milestones
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    completedAt: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending' },
  }],
  
  // Notes
  notes: String,
  
  // Parent project (for sub-projects)
  parentProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: String,
}, {
  collection: 'projects',
});

// Indexes
ProjectSchema.index({ code: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ 'team.manager.userId': 1 });
ProjectSchema.index({ 'timeline.endDate': 1 });

/**
 * Task Schema
 */
const TaskSchema = new mongoose.Schema({
  // Project reference
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  
  // Basic info
  title: { type: String, required: true },
  description: String,
  code: String,
  
  // Status and priority
  status: { type: String, enum: Object.keys(projectConfig.taskStatuses), default: 'todo' },
  priority: { type: String, enum: Object.keys(projectConfig.priorities), default: 'medium' },
  
  // Type
  type: { type: String, enum: ['task', 'bug', 'feature', 'improvement', 'documentation'] },
  
  // Assignment
  assignees: [{
    userId: String,
    name: String,
    assignedAt: Date,
  }],
  
  // Reporter
  reporter: {
    userId: String,
    name: String,
  },
  
  // Dates
  dueDate: Date,
  startDate: Date,
  completedAt: Date,
  
  // Estimation
  estimation: {
    hours: Number,
    storyPoints: Number,
  },
  
  // Time tracking
  timeTracking: {
    estimated: Number, // hours
    logged: Number, // hours
    remaining: Number,
  },
  
  // Progress
  progress: { type: Number, min: 0, max: 100, default: 0 },
  
  // Parent task (for sub-tasks)
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  
  // Dependencies
  dependencies: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    type: { type: String, enum: ['blocks', 'blocked_by', 'relates_to'] },
  }],
  
  // Tags
  tags: [String],
  
  // Attachments
  attachments: [{
    name: String,
    filePath: String,
    uploadedAt: Date,
  }],
  
  // Comments count
  commentsCount: { type: Number, default: 0 },
  
  // Sprint (if using Agile)
  sprint: {
    id: String,
    name: String,
  },
  
  // Labels
  labels: [String],
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: String,
}, {
  collection: 'tasks',
});

// Indexes
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ 'assignees.userId': 1 });

/**
 * Task Comment Schema
 */
const TaskCommentSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  
  content: { type: String, required: true },
  
  author: {
    userId: String,
    name: String,
    avatar: String,
  },
  
  mentions: [{
    userId: String,
    name: String,
  }],
  
  attachments: [{
    name: String,
    filePath: String,
  }],
  
  isInternal: { type: Boolean, default: false }, // Not visible to client
  
  tenantId: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'task_comments',
});

/**
 * Project Management Service Class
 */
class ProjectManagementService extends EventEmitter {
  constructor() {
    super();
    this.Project = null;
    this.Task = null;
    this.TaskComment = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Project = connection.model('Project', ProjectSchema);
    this.Task = connection.model('Task', TaskSchema);
    this.TaskComment = connection.model('TaskComment', TaskCommentSchema);
    
    console.log('✅ Project Management Service initialized');
  }
  
  // ============ Projects ============
  
  /**
   * Create project
   */
  async createProject(data) {
    const code = data.code || await this.generateProjectCode(data.type);
    
    const project = await this.Project.create({
      ...data,
      code,
    });
    
    this.emit('project:created', project);
    
    return project;
  }
  
  /**
   * Generate project code
   */
  async generateProjectCode(type) {
    const prefix = {
      internal: 'INT',
      client: 'CLI',
      maintenance: 'MNT',
      research: 'RND',
      infrastructure: 'INF',
    }[type] || 'PRJ';
    
    const year = new Date().getFullYear();
    const count = await this.Project.countDocuments({ type, createdAt: { $gte: new Date(year, 0, 1) } });
    const sequence = (count + 1).toString().padStart(4, '0');
    
    return `${prefix}-${year}-${sequence}`;
  }
  
  /**
   * Get project by ID
   */
  async getProject(projectId) {
    return this.Project.findById(projectId)
      .populate('branch')
      .populate('parentProject');
  }
  
  /**
   * Update project
   */
  async updateProject(projectId, updates, userId) {
    const project = await this.Project.findByIdAndUpdate(
      projectId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('project:updated', project);
    
    return project;
  }
  
  /**
   * Update project status
   */
  async updateProjectStatus(projectId, status, userId) {
    const project = await this.Project.findByIdAndUpdate(
      projectId,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('project:status_changed', { project, status });
    
    return project;
  }
  
  /**
   * Get projects
   */
  async getProjects(options = {}) {
    const filter = {};
    
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;
    if (options.department) filter.department = options.department;
    if (options.branch) filter.branch = options.branch;
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    if (options.managerId) filter['team.manager.userId'] = options.managerId;
    if (options.memberId) filter['team.members.userId'] = options.memberId;
    
    return this.Project.find(filter)
      .populate('branch')
      .sort(options.sort || { createdAt: -1 })
      .limit(options.limit || 100);
  }
  
  /**
   * Add team member
   */
  async addTeamMember(projectId, memberData) {
    const project = await this.Project.findById(projectId);
    if (!project) throw new Error('Project not found');
    
    project.team.members.push({
      ...memberData,
      joinedAt: new Date(),
    });
    
    await project.save();
    
    this.emit('project:member_added', { project, member: memberData });
    
    return project;
  }
  
  /**
   * Add milestone
   */
  async addMilestone(projectId, milestoneData) {
    const project = await this.Project.findById(projectId);
    if (!project) throw new Error('Project not found');
    
    project.milestones.push(milestoneData);
    await project.save();
    
    return project;
  }
  
  /**
   * Complete milestone
   */
  async completeMilestone(projectId, milestoneIndex) {
    const project = await this.Project.findById(projectId);
    if (!project || !project.milestones[milestoneIndex]) {
      throw new Error('Project or milestone not found');
    }
    
    project.milestones[milestoneIndex].status = 'completed';
    project.milestones[milestoneIndex].completedAt = new Date();
    
    await project.save();
    
    return project;
  }
  
  /**
   * Update project progress
   */
  async updateProjectProgress(projectId) {
    const tasks = await this.Task.find({ projectId });
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const project = await this.Project.findByIdAndUpdate(
      projectId,
      {
        'progress.percentage': percentage,
        'progress.tasksCompleted': completed,
        'progress.tasksTotal': total,
        'progress.lastUpdated': new Date(),
      },
      { new: true }
    );
    
    return project;
  }
  
  // ============ Tasks ============
  
  /**
   * Create task
   */
  async createTask(data) {
    const task = await this.Task.create({
      ...data,
      createdBy: data.userId,
    });
    
    // Update project progress
    if (data.projectId) {
      await this.updateProjectProgress(data.projectId);
    }
    
    this.emit('task:created', task);
    
    return task;
  }
  
  /**
   * Get task
   */
  async getTask(taskId) {
    return this.Task.findById(taskId)
      .populate('projectId')
      .populate('parentTask');
  }
  
  /**
   * Update task
   */
  async updateTask(taskId, updates, userId) {
    const task = await this.Task.findByIdAndUpdate(
      taskId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    // Update project progress
    if (task.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
    
    this.emit('task:updated', task);
    
    return task;
  }
  
  /**
   * Update task status
   */
  async updateTaskStatus(taskId, status, userId) {
    const task = await this.Task.findByIdAndUpdate(
      taskId,
      {
        status,
        updatedAt: new Date(),
        ...(status === 'done' ? { completedAt: new Date() } : {}),
      },
      { new: true }
    );
    
    if (task.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
    
    this.emit('task:status_changed', { task, status });
    
    return task;
  }
  
  /**
   * Assign task
   */
  async assignTask(taskId, userIds, assignedBy) {
    const assignees = userIds.map(userId => ({
      userId,
      assignedAt: new Date(),
    }));
    
    const task = await this.Task.findByIdAndUpdate(
      taskId,
      { assignees, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('task:assigned', { task, assignees: userIds });
    
    return task;
  }
  
  /**
   * Get project tasks
   */
  async getProjectTasks(projectId, options = {}) {
    const filter = { projectId };
    
    if (options.status) filter.status = options.status;
    if (options.priority) filter.priority = options.priority;
    if (options.assigneeId) filter['assignees.userId'] = options.assigneeId;
    
    return this.Task.find(filter)
      .sort(options.sort || { priority: -1, createdAt: 1 })
      .limit(options.limit || 100);
  }
  
  /**
   * Get user tasks
   */
  async getUserTasks(userId, options = {}) {
    const filter = { 'assignees.userId': userId };
    
    if (options.status) filter.status = options.status;
    if (options.projectId) filter.projectId = options.projectId;
    
    return this.Task.find(filter)
      .populate('projectId')
      .sort({ priority: -1, dueDate: 1 })
      .limit(options.limit || 50);
  }
  
  /**
   * Add task dependency
   */
  async addTaskDependency(taskId, dependsOnTaskId, type = 'blocked_by') {
    const task = await this.Task.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    task.dependencies.push({
      taskId: dependsOnTaskId,
      type,
    });
    
    await task.save();
    
    return task;
  }
  
  /**
   * Log time
   */
  async logTime(taskId, hours, userId) {
    const task = await this.Task.findById(taskId);
    if (!task) throw new Error('Task not found');
    
    task.timeTracking.logged = (task.timeTracking.logged || 0) + hours;
    task.timeTracking.remaining = Math.max(0, (task.timeTracking.estimated || 0) - task.timeTracking.logged);
    
    await task.save();
    
    return task;
  }
  
  // ============ Comments ============
  
  /**
   * Add comment
   */
  async addComment(taskId, content, userId, options = {}) {
    const comment = await this.TaskComment.create({
      taskId,
      content,
      author: {
        userId: options.user?.id,
        name: options.user?.name,
        avatar: options.user?.avatar,
      },
      mentions: this.extractMentions(content),
      attachments: options.attachments,
      isInternal: options.isInternal,
      tenantId: options.tenantId,
    });
    
    // Update comments count
    await this.Task.findByIdAndUpdate(taskId, { $inc: { commentsCount: 1 } });
    
    this.emit('comment:added', comment);
    
    return comment;
  }
  
  /**
   * Extract mentions
   */
  extractMentions(content) {
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push({ userId: match[1] });
    }
    
    return mentions;
  }
  
  /**
   * Get comments
   */
  async getComments(taskId, options = {}) {
    const filter = { taskId };
    if (!options.includeInternal) filter.isInternal = false;
    
    return this.TaskComment.find(filter)
      .sort({ createdAt: 1 })
      .limit(options.limit || 100);
  }
  
  // ============ Statistics ============
  
  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId) {
    const tasks = await this.Task.find({ projectId });
    
    const byStatus = {};
    const byPriority = {};
    
    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    }
    
    const overdue = tasks.filter(t => 
      t.dueDate && new Date() > t.dueDate && t.status !== 'done'
    ).length;
    
    return {
      totalTasks: tasks.length,
      completed: byStatus.done || 0,
      inProgress: byStatus.in_progress || 0,
      overdue,
      byStatus,
      byPriority,
    };
  }
  
  /**
   * Get dashboard statistics
   */
  async getDashboardStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [
      totalProjects,
      activeProjects,
      totalTasks,
      tasksByStatus,
    ] = await Promise.all([
      this.Project.countDocuments(filter),
      this.Project.countDocuments({ ...filter, status: 'active' }),
      this.Task.countDocuments(filter),
      this.Task.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    
    return {
      totalProjects,
      activeProjects,
      totalTasks,
      tasksByStatus: tasksByStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    };
  }
}

// Singleton instance
const projectManagementService = new ProjectManagementService();

/**
 * Project Statuses (Arabic)
 */
const projectStatuses = {
  draft: { label: 'مسودة', icon: 'file' },
  planned: { label: 'مخطط', icon: 'calendar' },
  active: { label: 'نشط', icon: 'play' },
  on_hold: { label: 'معلق', icon: 'pause' },
  completed: { label: 'مكتمل', icon: 'check' },
  cancelled: { label: 'ملغي', icon: 'x' },
};

module.exports = {
  ProjectManagementService,
  projectManagementService,
  projectConfig,
  projectStatuses,
};