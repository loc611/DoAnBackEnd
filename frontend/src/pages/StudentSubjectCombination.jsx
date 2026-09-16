import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Send, 
  BookOpen, 
  School, 
  ChevronRight, 
  HelpCircle,
  Award,
  Users
} from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

const StudentSubjectCombination = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [combinations, setCombinations] = useState([]);
  const [currentRegistration, setCurrentRegistration] = useState(null);

  const [form, setForm] = useState({
    firstChoiceId: '',
    secondChoiceId: '',
    thirdChoiceId: '',
    note: ''
  });

  useEffect(() => {
    fetchCombinations();
  }, []);

  const fetchCombinations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/subject-combinations');
      if (res.data?.success) {
        setCombinations(res.data.data.combinations || []);
        const reg = res.data.data.currentRegistration;
        if (reg) {
          setCurrentRegistration(reg);
          setForm({
            firstChoiceId: reg.firstChoiceId || '',
            secondChoiceId: reg.secondChoiceId || '',
            thirdChoiceId: reg.thirdChoiceId || '',
            note: reg.note || ''
          });
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh mục tổ hợp môn:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstChoiceId || !form.secondChoiceId) {
      Swal.fire({
        icon: 'warning',
        title: 'Chưa đủ nguyện vọng',
        text: 'Vui lòng chọn tối thiểu Nguyện vọng 1 (NV1) và Nguyện vọng 2 (NV2)',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    if (
      form.firstChoiceId === form.secondChoiceId ||
      (form.thirdChoiceId && (form.thirdChoiceId === form.firstChoiceId || form.thirdChoiceId === form.secondChoiceId))
    ) {
      Swal.fire({
        icon: 'error',
        title: 'Trùng lặp nguyện vọng',
        text: 'Mỗi nguyện vọng (NV1, NV2, NV3) phải là một tổ hợp môn khác nhau!',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/student/subject-group-registration', form);
      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Đăng ký thành công!',
          text: 'Nguyện vọng tổ hợp môn của bạn đã được ghi nhận. Nhà trường sẽ xét duyệt xếp lớp theo chỉ tiêu.',
          confirmButtonColor: '#10b981'
        });
        fetchCombinations();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Đăng ký thất bại',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi lưu đăng ký',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Đang tải danh mục tổ hợp môn khối 10...</p>
      </div>
    );
  }

  const isApproved = currentRegistration?.status === 'APPROVED';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-purple-200">
            <Sparkles size={14} className="text-yellow-300" />
            <span>Chương Trình Giáo Dục Phổ Thông 2018</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Đăng Ký Tổ Hợp Môn Học Lựa Chọn (Khối 10)
          </h1>

          <p className="text-sm text-purple-100 max-w-2xl leading-relaxed">
            Học sinh khối 10 mới nhập học chọn thứ tự nguyện vọng tổ hợp môn (NV1, NV2, NV3) 
            theo định hướng nghề nghiệp và năng lực cá nhân.
          </p>
        </div>
      </div>

      {/* Trạng thái xét duyệt xếp lớp nếu đã đăng ký */}
      {currentRegistration && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isApproved
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isApproved ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
              {isApproved ? <CheckCircle2 size={24} /> : <Clock size={24} />}
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-base">
                Trạng thái: {isApproved ? 'Đã Xét Duyệt Xếp Lớp Chính Thức' : 'Đã Nộp Nguyện Vọng (Đang Chờ Xếp Lớp)'}
              </h3>
              <p className="text-xs opacity-90">
                {isApproved && currentRegistration.assignedClass ? (
                  <span>Bạn đã được xếp vào lớp chính thức: <strong className="text-emerald-700 dark:text-emerald-300">{currentRegistration.assignedClass.className}</strong></span>
                ) : (
                  <span>Hội đồng tuyển sinh đang xét điểm đầu vào và chỉ tiêu để phân lớp. Bạn có thể cập nhật lại trước hạn chót.</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold shrink-0">
            Nộp ngày: {new Date(currentRegistration.submittedAt).toLocaleDateString('vi-VN')}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT 1: FORM CHỌN NGUYỆN VỌNG (5 Cột) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white text-base">Phiếu Đăng Ký Nguyện Vọng</h2>
              <p className="text-xs text-slate-400">Chọn tối thiểu NV1 và NV2 theo thứ tự ưu tiên</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nguyện vọng 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Nguyện vọng 1 (Ưu tiên cao nhất) <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">NV1</span>
                </label>
                <select 
                  required
                  disabled={isApproved}
                  value={form.firstChoiceId}
                  onChange={(e) => setForm({ ...form, firstChoiceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">-- Chọn tổ hợp môn cho NV1 --</option>
                  {combinations.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nguyện vọng 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Nguyện vọng 2 <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">NV2</span>
                </label>
                <select 
                  required
                  disabled={isApproved}
                  value={form.secondChoiceId}
                  onChange={(e) => setForm({ ...form, secondChoiceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">-- Chọn tổ hợp môn cho NV2 --</option>
                  {combinations.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nguyện vọng 3 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Nguyện vọng 3 (Dự phòng)</span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">NV3</span>
                </label>
                <select 
                  disabled={isApproved}
                  value={form.thirdChoiceId}
                  onChange={(e) => setForm({ ...form, thirdChoiceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">-- Chọn tổ hợp môn cho NV3 (Không bắt buộc) --</option>
                  {combinations.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nguyện vọng bổ sung / Năng khiếu đặc biệt (nếu có)
                </label>
                <textarea 
                  rows={3}
                  disabled={isApproved}
                  placeholder="Ví dụ: Đã đạt giải HSG cấp Quận môn Toán, mong muốn học lớp chuyên ban Tự nhiên..."
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              {!isApproved ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={15} />
                  {submitting ? 'Đang lưu...' : (currentRegistration ? 'Cập Nhật Nguyện Vọng' : 'Nộp Đăng Ký Nguyện Vọng')}
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500">
                  🔒 Nguyện vọng đã được Ban Giám Hiệu khóa sau khi xét duyệt xếp lớp.
                </div>
              )}
            </form>
          </div>
        </div>

        {/* CỘT 2: DANH SÁCH CHI TIẾT CÁC TỔ HỢP MÔN (7 Cột) */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white text-base">Danh Sách Tổ Hợp Nhà Trường Đang Mở</h2>
            <p className="text-xs text-slate-400">Tham khảo các môn học thành phần và định hướng nghề nghiệp</p>
          </div>

          <div className="space-y-3">
            {combinations.map((comb) => (
              <div 
                key={comb.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        {comb.code}
                      </span>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                        {comb.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {comb.description}
                    </p>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    Chỉ tiêu: ~{comb.capacity} HS
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400">Các môn lựa chọn:</span>
                  {comb.subjectsList && comb.subjectsList.map((sub, sIdx) => (
                    <span 
                      key={sIdx}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSubjectCombination;
