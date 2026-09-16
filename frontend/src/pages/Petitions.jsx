import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Send, CheckCircle2, XCircle, Clock, Filter, AlertCircle, ShieldAlert, Paperclip, ChevronRight } from 'lucide-react';
import api from '../services/api';

const PETITION_TYPES = [
  { key: 'LEAVE_ABSENCE', name: 'Đơn Xin Nghỉ Học Có Phép', color: 'blue' },
  { key: 'GRADE_APPEAL', name: 'Đơn Xin Phúc Khảo Điểm', color: 'purple' },
  { key: 'TUITION_WAIVER', name: 'Đơn Xin Miễn Giảm Học Phí', color: 'emerald' },
  { key: 'CLASS_TRANSFER', name: 'Đơn Xin Chuyển Lớp / Ban', color: 'amber' }
];

const Petitions = () => {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'create'
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Form nộp đơn
  const [formType, setFormType] = useState('LEAVE_ABSENCE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [targetSemester, setTargetSemester] = useState('HK1_2026');
  const [targetGradeColumn, setTargetGradeColumn] = useState('gk');
  const [claimedScore, setClaimedScore] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const [subjects, setSubjects] = useState([]);

  // Modal xét duyệt
  const [reviewModalData, setReviewModalData] = useState(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const userRole = localStorage.getItem('userRole');
  const isApprover = userRole === 'admin' || userRole === 'teacher';

  useEffect(() => {
    fetchPetitions();
    fetchSubjects();
  }, [selectedType, selectedStatus]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data?.data || res.data || []);
    } catch (e) {}
  };

  const fetchPetitions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/petitions', {
        params: {
          type: selectedType || undefined,
          status: selectedStatus || undefined
        }
      });
      setPetitions(res.data?.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn từ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPetition = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/petitions', {
        type: formType,
        title,
        content,
        startDate: formType === 'LEAVE_ABSENCE' ? startDate : undefined,
        endDate: formType === 'LEAVE_ABSENCE' ? endDate : undefined,
        reason,
        targetSubjectId: formType === 'GRADE_APPEAL' ? targetSubjectId : undefined,
        targetSemester: formType === 'GRADE_APPEAL' ? targetSemester : undefined,
        targetGradeColumn: formType === 'GRADE_APPEAL' ? targetGradeColumn : undefined,
        claimedScore: formType === 'GRADE_APPEAL' && claimedScore ? Number(claimedScore) : undefined,
        attachedProofUrls: proofUrl ? [proofUrl] : []
      });

      alert('Đã gửi đơn từ số hóa thành công! Hệ thống sẽ thông báo ngay khi có kết quả xử lý.');
      setTitle('');
      setContent('');
      setReason('');
      setClaimedScore('');
      setProofUrl('');
      setActiveTab('inbox');
      fetchPetitions();
    } catch (err) {
      alert('Lỗi khi gửi đơn: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async (status) => {
    if (!reviewModalData) return;
    try {
      setReviewing(true);
      await api.patch(`/petitions/${reviewModalData.id}/review`, {
        status,
        approvalRemark: reviewRemark
      });

      alert(`Đã ${status === 'APPROVED' ? 'phê duyệt' : 'từ chối'} đơn thành công!`);
      setReviewModalData(null);
      setReviewRemark('');
      fetchPetitions();
    } catch (err) {
      alert('Lỗi phê duyệt: ' + (err.response?.data?.message || err.message));
    } finally {
      setReviewing(false);
    }
  };

  const getTypeBadge = (type) => {
    const found = PETITION_TYPES.find(t => t.key === type);
    return found ? found.name : type;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 size={13} /> ĐÃ DUYỆT</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1"><XCircle size={13} /> TỪ CHỐI</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock size={13} /> CHỜ XÉT DUYỆT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Dịch Vụ Hành Chính Công Trường Học
          </span>
          <h1 className="text-3xl font-extrabold mt-2 flex items-center gap-3">
            <FileText size={32} /> Cổng Đơn Từ & Phúc Khảo Số Hóa
          </h1>
          <p className="text-purple-100 text-sm mt-1">
            Quy trình tiếp nhận, phê duyệt đơn từ và kích hoạt mở khóa điểm phúc khảo tự động
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inbox' ? 'bg-white text-purple-900 shadow-md' : 'text-white hover:bg-white/10'
            }`}
          >
            Hộp Thư Đơn Từ ({petitions.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'create' ? 'bg-white text-purple-900 shadow-md' : 'text-white hover:bg-white/10'
            }`}
          >
            + Nộp Đơn Trực Tuyến
          </button>
        </div>
      </div>

      {activeTab === 'inbox' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              >
                <option value="">Tất cả loại đơn từ</option>
                {PETITION_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="SUBMITTED">Chờ duyệt</option>
                <option value="APPROVED">Đã phê duyệt</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
            </div>

            <span className="text-xs text-gray-400 font-medium">
              Hiển thị {petitions.length} đơn từ
            </span>
          </div>

          {/* Petitions List */}
          <div className="divide-y divide-gray-100">
            {petitions.map(pet => (
              <div key={pet.id} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                      {getTypeBadge(pet.type)}
                    </span>
                    <h4 className="font-extrabold text-gray-800 text-base">{pet.title}</h4>
                    {getStatusBadge(pet.status)}
                  </div>

                  <p className="text-xs text-gray-500">
                    Người nộp: <strong>{pet.student?.fullName || 'Học sinh'}</strong> ({pet.student?.studentCode}) • Lớp: <strong>{pet.student?.class?.className || 'Chưa xếp lớp'}</strong> • Nộp lúc: {new Date(pet.createdAt).toLocaleString('vi-VN')}
                  </p>

                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {pet.content}
                  </p>

                  {/* Chi tiết theo loại */}
                  {pet.type === 'LEAVE_ABSENCE' && pet.startDate && (
                    <p className="text-[11px] text-blue-700 font-semibold">
                      📅 Thời gian xin nghỉ: Từ {new Date(pet.startDate).toLocaleDateString('vi-VN')} đến {new Date(pet.endDate).toLocaleDateString('vi-VN')}
                    </p>
                  )}

                  {pet.type === 'GRADE_APPEAL' && (
                    <p className="text-[11px] text-purple-700 font-semibold">
                      🎯 Phúc khảo cột điểm: <strong>{pet.targetGradeColumn?.toUpperCase()}</strong> • Điểm mong muốn: <strong>{pet.claimedScore ?? 'Chưa rõ'}</strong>
                    </p>
                  )}

                  {pet.temporaryUnlockToken && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block font-mono">
                      🔑 Đã mở khóa sửa điểm tạm thời (Token: {pet.temporaryUnlockToken.slice(0, 10)}... Hết hạn: {new Date(pet.unlockTokenExpiresAt).toLocaleTimeString('vi-VN')})
                    </p>
                  )}

                  {pet.approvalRemark && (
                    <p className="text-xs text-gray-600 italic">
                      Ý kiến phê duyệt: "{pet.approvalRemark}"
                    </p>
                  )}
                </div>

                {/* Approver Action */}
                {isApprover && pet.status === 'SUBMITTED' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setReviewModalData(pet)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-purple-600/20"
                    >
                      Xét Duyệt Đơn
                    </button>
                  </div>
                )}
              </div>
            ))}

            {petitions.length === 0 && !loading && (
              <div className="p-16 text-center text-gray-400">
                Chưa có đơn từ nào trong danh mục này.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Form Nộp Đơn Từ Mới */
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
          <h3 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center gap-2">
            <Send size={20} className="text-purple-600" /> Biểu Mẫu Nộp Đơn Trực Tuyến
          </h3>

          <form onSubmit={handleSubmitPetition} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Chọn loại đơn từ *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full text-xs font-semibold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
              >
                {PETITION_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Tiêu đề đơn *</label>
              <input
                type="text"
                required
                placeholder="VD: Đơn xin nghỉ phép 2 ngày do điều trị bệnh"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-semibold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
              />
            </div>

            {/* Form nghỉ học */}
            {formType === 'LEAVE_ABSENCE' && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div>
                  <label className="text-xs font-bold text-blue-900 block mb-1">Nghỉ từ ngày *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-blue-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-900 block mb-1">Đến hết ngày *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-blue-200 rounded-xl outline-none"
                  />
                </div>
              </div>
            )}

            {/* Form phúc khảo */}
            {formType === 'GRADE_APPEAL' && (
              <div className="grid grid-cols-3 gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                <div>
                  <label className="text-xs font-bold text-purple-900 block mb-1">Môn học *</label>
                  <select
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    required
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-purple-200 rounded-xl outline-none"
                  >
                    <option value="">Chọn môn</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-900 block mb-1">Cột điểm *</label>
                  <select
                    value={targetGradeColumn}
                    onChange={(e) => setTargetGradeColumn(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-purple-200 rounded-xl outline-none"
                  >
                    <option value="gk">ĐĐG Giữa kỳ (GK)</option>
                    <option value="ck">ĐĐG Cuối kỳ (CK)</option>
                    <option value="tx1">ĐĐG Thường xuyên 1</option>
                    <option value="tx2">ĐĐG Thường xuyên 2</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-900 block mb-1">Điểm tự chấm</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="VD: 8.5"
                    value={claimedScore}
                    onChange={(e) => setClaimedScore(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-purple-200 rounded-xl outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nội dung giải trình / Lý do chi tiết *</label>
              <textarea
                rows={4}
                required
                placeholder="Kính gửi Ban Giám hiệu và Giáo viên chủ nhiệm..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Đường dẫn tài liệu minh chứng (ảnh bệnh án, quyết định...)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/... hoặc link ảnh"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full text-xs font-semibold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Quay Lại
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20"
              >
                {submitting ? 'Đang gửi đơn...' : 'Gửi Đơn Lên Nhà Trường'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <h3 className="font-extrabold text-lg">Xét Duyệt Đơn Từ</h3>
                <p className="text-xs text-purple-100 mt-0.5">
                  Học sinh: {reviewModalData.student?.fullName} ({reviewModalData.student?.studentCode})
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs text-gray-700 space-y-1">
                  <p><strong>Loại đơn:</strong> {getTypeBadge(reviewModalData.type)}</p>
                  <p><strong>Tiêu đề:</strong> {reviewModalData.title}</p>
                  <p><strong>Nội dung:</strong> {reviewModalData.content}</p>
                  {reviewModalData.type === 'LEAVE_ABSENCE' && (
                    <p className="text-emerald-700 font-bold">
                      ⚡ Phê duyệt sẽ tự động cập nhật chuyên cần thành 'Nghỉ có phép'.
                    </p>
                  )}
                  {reviewModalData.type === 'GRADE_APPEAL' && (
                    <p className="text-purple-700 font-bold">
                      ⚡ Phê duyệt sẽ cấp quyền mở khóa sổ điểm trong 24 giờ cho GVBM.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Ý kiến phản hồi của người duyệt</label>
                  <textarea
                    rows={2}
                    placeholder="Đồng ý giải quyết / Hồ sơ hợp lệ..."
                    value={reviewRemark}
                    onChange={(e) => setReviewRemark(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalData(null)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => handleReviewAction('REJECTED')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                  >
                    Từ Chối
                  </button>
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => handleReviewAction('APPROVED')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                  >
                    {reviewing ? 'Đang duyệt...' : '✓ Chấp Thuận'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Petitions;
