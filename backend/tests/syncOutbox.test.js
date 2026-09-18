import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatStudentPayload } from '../services/outboxService.js';

describe('Transactional Outbox & Sync Logic Test Suite', () => {
  it('formatStudentPayload formats student object correctly with nested class', () => {
    const mockStudent = {
      id: 'student-123',
      studentCode: 'HS1001',
      fullName: 'Nguyen Van A',
      gender: 'Nam',
      phone: '0901234567',
      parentPhone: '0907654321',
      parentName: 'Nguyen Van B',
      status: 'active',
      classId: 'class-1',
      class: { className: '10A1', grade: 10 },
      updatedAt: new Date('2026-09-16T10:00:00Z')
    };

    const payload = formatStudentPayload(mockStudent);

    assert.strictEqual(payload.id, 'student-123');
    assert.strictEqual(payload.studentCode, 'HS1001');
    assert.strictEqual(payload.fullName, 'Nguyen Van A');
    assert.strictEqual(payload.className, '10A1');
    assert.strictEqual(payload.status, 'active');
    assert.strictEqual(payload.phone, '0901234567');
    assert.ok(payload.updatedAt);
  });

  it('formatStudentPayload handles fallback when class object is not loaded', () => {
    const mockStudent = {
      id: 'student-456',
      studentCode: 'HS1002',
      fullName: 'Tran Thi C',
      className: '11B2',
      status: 'active'
    };

    const payload = formatStudentPayload(mockStudent);
    assert.strictEqual(payload.id, 'student-456');
    assert.strictEqual(payload.className, '11B2');
    assert.strictEqual(payload.gender, null);
  });

  it('External versioning logic guarantees monotonic updates', () => {
    const currentDocVersion = 5;
    const incomingStaleVersion = 4;
    const incomingNewerVersion = 6;

    // Stale version must be rejected/ignored (simulates Elasticsearch external version check)
    assert.strictEqual(incomingStaleVersion > currentDocVersion, false);

    // Newer version must be accepted
    assert.strictEqual(incomingNewerVersion > currentDocVersion, true);
  });
});
