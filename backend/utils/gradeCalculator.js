/**
 * Grade Calculator Module - Tuân thủ Thông tư 22/2021/TT-BGDĐT
 * Quy định về đánh giá học sinh trung học cơ sở và trung học phổ thông
 */

/**
 * Làm tròn điểm đến 1 chữ số thập phân
 */
export const roundScore = (score) => {
  if (score === null || score === undefined || isNaN(score)) return null;
  return Math.round(Number(score) * 10) / 10;
};

/**
 * Tính Điểm trung bình môn học kỳ (ĐTBmhk) theo Điều 9 Thông tư 22
 * ĐTBmhk = (Tổng ĐĐGtx + 2 * ĐĐGgk + 3 * ĐĐGck) / (Số ĐĐGtx + 5)
 * @param {Array<number>} regularScores - Danh sách điểm đánh giá thường xuyên [tx1, tx2, ...]
 * @param {number|null} midtermScore - Điểm đánh giá giữa kỳ
 * @param {number|null} finalScore - Điểm đánh giá cuối kỳ
 * @param {string} [assessmentType='score'] - 'score' (tính điểm) hoặc 'feedback' (nhận xét)
 * @param {string|null} [feedbackResult=null] - 'Đ' (Đạt) hoặc 'CĐ' (Chưa đạt)
 * @returns {{ avgScore: number|null, feedbackResult: string|null, isComplete: boolean }}
 */
export const calculateSubjectSemesterAverage = ({
  regularScores = [],
  midtermScore = null,
  finalScore = null,
  assessmentType = 'score',
  feedbackResult = null
}) => {
  if (assessmentType === 'feedback') {
    const validFeedback = feedbackResult === 'Đ' || feedbackResult === 'CĐ' ? feedbackResult : null;
    return {
      avgScore: null,
      feedbackResult: validFeedback,
      isComplete: validFeedback !== null
    };
  }

  // Lọc các đầu điểm thường xuyên hợp lệ (từ 0 đến 10)
  const validRegular = (Array.isArray(regularScores) ? regularScores : [])
    .map(Number)
    .filter(s => !isNaN(s) && s >= 0 && s <= 10);

  const hasMidterm = midtermScore !== null && midtermScore !== undefined && !isNaN(midtermScore) && Number(midtermScore) >= 0 && Number(midtermScore) <= 10;
  const hasFinal = finalScore !== null && finalScore !== undefined && !isNaN(finalScore) && Number(finalScore) >= 0 && Number(finalScore) <= 10;

  // Nếu chưa có bất kỳ điểm nào
  if (validRegular.length === 0 && !hasMidterm && !hasFinal) {
    return { avgScore: null, feedbackResult: null, isComplete: false };
  }

  // Nếu đủ tất cả các thành phần
  const isComplete = validRegular.length > 0 && hasMidterm && hasFinal;

  const sumRegular = validRegular.reduce((acc, curr) => acc + curr, 0);
  const mid = hasMidterm ? Number(midtermScore) * 2 : 0;
  const fin = hasFinal ? Number(finalScore) * 3 : 0;

  const totalPoints = sumRegular + mid + fin;
  const totalCoefficients = validRegular.length + (hasMidterm ? 2 : 0) + (hasFinal ? 3 : 0);

  if (totalCoefficients === 0) {
    return { avgScore: null, feedbackResult: null, isComplete: false };
  }

  const rawAvg = totalPoints / totalCoefficients;
  return {
    avgScore: roundScore(rawAvg),
    feedbackResult: null,
    isComplete
  };
};

/**
 * Tính Điểm trung bình môn cả năm (ĐTBmcn) theo Thông tư 22
 * ĐTBmcn = (ĐTBmhk1 + 2 * ĐTBmhk2) / 3
 */
export const calculateSubjectYearlyAverage = (sem1Avg, sem2Avg) => {
  if (sem1Avg === null || sem1Avg === undefined || isNaN(sem1Avg)) return null;
  if (sem2Avg === null || sem2Avg === undefined || isNaN(sem2Avg)) return null;

  const s1 = Number(sem1Avg);
  const s2 = Number(sem2Avg);
  const rawAvg = (s1 + 2 * s2) / 3;
  return roundScore(rawAvg);
};

/**
 * Đánh giá kết quả rèn luyện và học tập học kỳ theo Thông tư 22/2021/TT-BGDĐT
 * @param {Array<Object>} subjectGrades - Danh sách điểm các môn học của học sinh
 * @param {string} [conductScore='Tốt'] - Kết quả rèn luyện: 'Tốt', 'Khá', 'Đạt', 'Chưa đạt'
 * @returns {{ overallAvg: number|null, academicRank: string, titleAwarded: string|null, details: Object }}
 */
export const evaluateSemesterSummary = (subjectGrades = [], conductScore = 'Tốt') => {
  const scoredSubjects = [];
  const feedbackSubjects = [];

  for (const item of subjectGrades) {
    if (item.assessmentType === 'feedback') {
      feedbackSubjects.push(item);
    } else if (item.avgScore !== null && item.avgScore !== undefined && !isNaN(item.avgScore)) {
      scoredSubjects.push(Number(item.avgScore));
    }
  }

  // 1. Tính Điểm trung bình tất cả các môn tính điểm
  let overallAvg = null;
  if (scoredSubjects.length > 0) {
    const sum = scoredSubjects.reduce((a, b) => a + b, 0);
    overallAvg = roundScore(sum / scoredSubjects.length);
  }

  // 2. Đánh giá Môn nhận xét:
  // Đếm số môn Đạt và Chưa đạt
  const totalFeedback = feedbackSubjects.length;
  const passFeedbackCount = feedbackSubjects.filter(s => s.feedbackResult === 'Đ').length;
  const failFeedbackCount = feedbackSubjects.filter(s => s.feedbackResult === 'CĐ').length;
  const allFeedbackPassed = totalFeedback === 0 || failFeedbackCount === 0;

  // 3. Phân tích các môn tính điểm:
  const scoredCount = scoredSubjects.length;
  const countGte9 = scoredSubjects.filter(s => s >= 9.0).length;
  const countGte8 = scoredSubjects.filter(s => s >= 8.0).length;
  const countGte65 = scoredSubjects.filter(s => s >= 6.5).length;
  const countGte5 = scoredSubjects.filter(s => s >= 5.0).length;
  const minScore = scoredCount > 0 ? Math.min(...scoredSubjects) : 0;

  // 4. Xác định Mức xếp loại Học tập (Điều 9 Thông tư 22):
  // Nếu chưa có dữ liệu điểm
  if (scoredCount === 0 && totalFeedback === 0) {
    return {
      overallAvg: null,
      academicRank: 'Chưa đánh giá',
      titleAwarded: null,
      details: { scoredCount, feedbackCount: totalFeedback }
    };
  }

  let academicRank = 'Chưa đạt';

  // Điều kiện Mức Tốt:
  // - Tất cả môn nhận xét đạt Đạt.
  // - Tất cả môn tính điểm >= 6.5, trong đó có ít nhất 6 môn >= 8.0 (hoặc >= 50% số môn nếu trường hợp đặc biệt, ở THPT chuẩn là 6 môn).
  const requiredCount8 = Math.min(6, scoredCount);
  const requiredCount65 = Math.min(6, scoredCount);
  const requiredCount5 = Math.min(6, scoredCount);

  if (allFeedbackPassed && minScore >= 6.5 && countGte8 >= requiredCount8) {
    academicRank = 'Tốt';
  }
  // Điều kiện Mức Khá:
  // - Tất cả môn nhận xét đạt Đạt.
  // - Tất cả môn tính điểm >= 5.0, trong đó có ít nhất 6 môn >= 6.5.
  else if (allFeedbackPassed && minScore >= 5.0 && countGte65 >= requiredCount65) {
    academicRank = 'Khá';
  }
  // Điều kiện Mức Đạt:
  // - Có nhiều nhất 01 môn nhận xét đánh giá Chưa đạt.
  // - Có ít nhất 6 môn tính điểm >= 5.0, không có môn nào < 3.5.
  else if (failFeedbackCount <= 1 && minScore >= 3.5 && countGte5 >= requiredCount5) {
    academicRank = 'Đạt';
  } else {
    academicRank = 'Chưa đạt';
  }

  // 5. Xác định Danh hiệu khen thưởng (Điều 15 Thông tư 22):
  // - "Học sinh Xuất sắc": Rèn luyện Tốt, Học tập Tốt và có ít nhất 6 môn tính điểm >= 9.0.
  // - "Học sinh Giỏi": Rèn luyện Tốt, Học tập Tốt.
  let titleAwarded = null;
  const validConduct = (conductScore || '').trim();

  if (validConduct === 'Tốt' && academicRank === 'Tốt') {
    if (countGte9 >= Math.min(6, scoredCount)) {
      titleAwarded = 'Học sinh Xuất sắc';
    } else {
      titleAwarded = 'Học sinh Giỏi';
    }
  }

  return {
    overallAvg,
    academicRank,
    titleAwarded,
    details: {
      scoredCount,
      feedbackCount: totalFeedback,
      countGte9,
      countGte8,
      countGte65,
      minScore,
      allFeedbackPassed
    }
  };
};
