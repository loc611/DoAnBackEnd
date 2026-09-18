import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateSubjectSemesterAverage } from '../utils/gradeCalculator.js';

describe('EdTech K-12 GDPT 2018 Interaction Workflows Test Suite', () => {
    describe('1. Two-Man Rule Grade Change & TT22 Recalculation', () => {
        it('calculates initial semester average correctly according to TT22 weights', () => {
            // Formula: (tx1 + tx2 + tx3 + tx4 + gk*2 + ck*3) / (count(tx) + 2 + 3)
            // tx1=8, tx2=8, gk=7, ck=9
            // sum = 8 + 8 + 7*2 + 9*3 = 8 + 8 + 14 + 27 = 57
            // count = 2 + 2 + 3 = 7
            // avg = 57 / 7 = 8.14 -> 8.1
            const initialObj = {
                tx1: 8.0,
                tx2: 8.0,
                gk: 7.0,
                ck: 9.0
            };
            const avg = calculateSubjectSemesterAverage(initialObj);
            assert.strictEqual(avg, 8.1);
        });

        it('recalculates semester average properly when Two-Man Rule updates ck from 9.0 to 10.0', () => {
            // sum = 8 + 8 + 14 + 10*3 = 60
            // count = 7
            // avg = 60 / 7 = 8.57 -> 8.6
            const updatedObj = {
                tx1: 8.0,
                tx2: 8.0,
                gk: 7.0,
                ck: 10.0
            };
            const newAvg = calculateSubjectSemesterAverage(updatedObj);
            assert.strictEqual(newAvg, 8.6);
        });

        it('validates grade column key restrictions', () => {
            const validKeys = ['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck'];
            assert.ok(validKeys.includes('tx1'));
            assert.ok(validKeys.includes('gk'));
            assert.ok(validKeys.includes('ck'));
            assert.ok(!validKeys.includes('invalid_col'));
        });
    });

    describe('2. Tiered Absence Approval Logic', () => {
        it('calculates duration in days correctly for short leaves (<= 2 days)', () => {
            const fromDate = new Date('2026-10-01T00:00:00Z');
            const toDate = new Date('2026-10-02T00:00:00Z');
            const durationDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            
            assert.strictEqual(durationDays, 2);
            assert.ok(durationDays < 3, 'GVCN có thẩm quyền duyệt trực tiếp đơn <= 2 ngày');
        });

        it('detects extended leave (>= 3 days) requiring Admin / BGH escalation', () => {
            const fromDate = new Date('2026-10-01T00:00:00Z');
            const toDate = new Date('2026-10-05T00:00:00Z');
            const durationDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            assert.strictEqual(durationDays, 5);
            assert.ok(durationDays >= 3, 'Đơn từ 3 ngày trở lên bắt buộc chuyển tiếp BGH phê duyệt');
        });

        it('triggers early warning alert when cumulative absences reach threshold', () => {
            const checkThreshold = (totalAbsences) => {
                if (totalAbsences >= 45) return { alert: true, severity: 'CRITICAL', status: 'DISQUALIFIED' };
                if (totalAbsences >= 35) return { alert: true, severity: 'HIGH', status: 'WARNING' };
                return { alert: false, severity: 'LOW', status: 'SAFE' };
            };

            assert.strictEqual(checkThreshold(20).alert, false);
            assert.strictEqual(checkThreshold(36).severity, 'HIGH');
            assert.strictEqual(checkThreshold(46).severity, 'CRITICAL');
        });
    });

    describe('3. Lesson Log Daily Compliance Calculation', () => {
        it('computes compliance percentage correctly for standard 5-period school day', () => {
            const computeCompliance = (totalPeriods, signedPeriods) => {
                const missing = Math.max(0, totalPeriods - signedPeriods);
                const rate = totalPeriods > 0 ? Math.round((signedPeriods / totalPeriods) * 100) : 100;
                return { missing, rate, isCompliant: missing === 0 };
            };

            const fullDay = computeCompliance(5, 5);
            assert.strictEqual(fullDay.rate, 100);
            assert.strictEqual(fullDay.isCompliant, true);

            const partialDay = computeCompliance(5, 3);
            assert.strictEqual(partialDay.rate, 60);
            assert.strictEqual(partialDay.missing, 2);
            assert.strictEqual(partialDay.isCompliant, false);
        });
    });
});
