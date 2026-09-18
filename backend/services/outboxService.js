/**
 * Helper to record transactional outbox events inside an existing Prisma transaction ($tx).
 */
export async function createOutboxEvent(tx, {
  aggregateType = 'STUDENT',
  aggregateId,
  eventType,
  version = 1,
  payload = {}
}) {
  if (!aggregateId) {
    throw new Error('[OutboxService] aggregateId is required to create outbox event');
  }
  if (!eventType) {
    throw new Error('[OutboxService] eventType is required to create outbox event');
  }

  return await tx.outboxEvent.create({
    data: {
      aggregateType,
      aggregateId,
      eventType,
      version,
      payload,
      status: 'PENDING'
    }
  });
}

/**
 * Standardize student payload for Elasticsearch indexing
 */
export function formatStudentPayload(student) {
  return {
    id: student.id,
    studentCode: student.studentCode || '',
    moetStudentCode: student.moetStudentCode || null,
    fullName: student.fullName || '',
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString() : null,
    gender: student.gender || null,
    phone: student.phone || null,
    parentPhone: student.parentPhone || null,
    parentName: student.parentName || null,
    address: student.address || null,
    email: student.email || null,
    status: student.status || 'active',
    classId: student.classId || null,
    className: student.class ? student.class.className : (student.className || null),
    updatedAt: student.updatedAt ? new Date(student.updatedAt).toISOString() : new Date().toISOString()
  };
}
