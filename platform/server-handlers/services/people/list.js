export function listPeople(db) {
  return db
    .prepare(
      `SELECT p.id, p.uuid, p.name, p.email, p.cpf, p.phone, p.photo, p.status,
              p.created_at AS createdAt, p.updated_at AS updatedAt,
              e.employee_code AS employeeCode, e.job_title AS jobTitle,
              e.employment_status AS employmentStatus,
              d.name AS departmentName
       FROM people p
       LEFT JOIN person_employment e ON e.person_id = p.id
       LEFT JOIN departments d ON d.id = e.department_id
       ORDER BY p.name COLLATE NOCASE`,
    )
    .all();
}

export function getPlatformStats(db) {
  return {
    users: db.prepare("SELECT COUNT(*) AS total FROM people").get().total,
    roles: db.prepare("SELECT COUNT(*) AS total FROM roles").get().total,
    departments: db.prepare("SELECT COUNT(*) AS total FROM departments").get().total,
    applications: db.prepare("SELECT COUNT(*) AS total FROM applications WHERE active = 1").get().total,
    sessions: db.prepare("SELECT COUNT(*) AS total FROM platform_sessions").get().total,
    auditLogs: db.prepare("SELECT COUNT(*) AS total FROM audit_logs").get().total,
  };
}
