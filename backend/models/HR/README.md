# HR Models Directory

This folder contains all advanced, modular, and extensible Mongoose models for
the Human Resources (HR) system, including:

- Employee (profile, job, personal info)
- Attendance (records, schedules, leave, absence)
- Payroll (salary, deductions, bonuses)
- Performance Evaluation (multi-source, weighted)
- HR Analytics (future)

## Integration

- All models are designed to integrate with the existing User, RBAC, and
  organization structure.
- Use `userId` (ref: User) as the main link for employee-centric models.

## Best Practices

- Keep models modular and extensible.
- Use references for cross-entity relationships.
- Index frequently queried fields.
- Document all schema fields and enums.

---

**Start new HR models here.**
