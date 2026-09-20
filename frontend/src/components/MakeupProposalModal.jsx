import React, { useState, useEffect } from 'react';
import { X, CalendarPlus, Sparkles } from 'lucide-react';

const PERIODS = Array.from({ length: 13 }, (_, i) => `Tiết ${i + 1}`);

const MakeupProposalModal = ({ isOpen, onClose, onSubmit, classes = [], subjects = [], initialData = null }) => {
  const [formData, setFormData] = useState({
    classId: '',
    subject: '',
    originalDate: '',
    originalPeriod: '',
    proposedDate: '',
    proposedPeriod: '',
    reason: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          classId: initialData.classId || '',
          subject: initialData.subject || '',
          originalDate: initialData.originalDate || '',
          originalPeriod: initialData.originalPeriod || '',
          proposedDate: initialData.proposedDate || '',
          proposedPeriod: initialData.proposedPeriod || '',
          reason: initialData.reason || ''
        });
      } else {
        setFormData({
          classId: '',
          subject: '',
          originalDate: '',
          originalPeriod: '',
          proposedDate: '',
          proposedPeriod: '',
          reason: ''
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CalendarPlus className="text-amber-500" size={20} />
            Đề xuất dạy bù
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {initialData?.contextNote && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <span>{initialData.contextNote}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Lớp học</label>
              <select
                name="classId"
                required
                value={formData.classId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              >
                <option value="">Chọn lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Môn học</label>
              <select
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              >
                <option value="">Chọn môn</option>
                {subjects.map((s, idx) => (
                  <option key={s.id || idx} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ngày nghỉ (gốc)</label>
              <input
                type="date"
                name="originalDate"
                required
                value={formData.originalDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tiết nghỉ</label>
              <select
                name="originalPeriod"
                required
                value={formData.originalPeriod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              >
                <option value="">Chọn tiết</option>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Ngày dạy bù (đề xuất)</label>
              <input
                type="date"
                name="proposedDate"
                required
                value={formData.proposedDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tiết dạy bù</label>
              <select
                name="proposedPeriod"
                required
                value={formData.proposedPeriod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              >
                <option value="">Chọn tiết</option>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Lý do</label>
            <textarea
              name="reason"
              required
              rows="3"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Nhập lý do xin dạy bù..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/30 transition-all active:scale-95"
            >
              Gửi đề xuất
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MakeupProposalModal;
