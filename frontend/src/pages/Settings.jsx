import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import api from '../services/api';
import {
  School,
  Calendar,
  Award,
  ShieldCheck,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Building2,
  Mail,
  Phone,
  Globe,
  UserCheck,
  Sparkles,
  Clock,
  FileJson,
  Check,
  Info,
  Server,
  Layers,
  AlertCircle
} from 'lucide-react';

const INITIAL_SETTINGS = {
  schoolName: 'Trường THPT TTLN',
  schoolCode: 'THPT-TTLN',
  address: '123 Đường Giáo Dục, TP. Hồ Chí Minh',
  phone: '028.3899.9999',
  email: 'contact@thpt-ttln.edu.vn',
  website: 'https://thpt-ttln.edu.vn',
  principalName: 'ThS. Nguyễn Văn Quản',
  logoUrl: '',
  slogan: 'Ươm mầm tri thức - Vững bước tương lai',
  academicYear: '2026-2027',
  currentSemester: 'HK1_2026',
  semesterStartDate: '2026-09-05',
  semesterEndDate: '2027-01-15',
  isGradingLocked: false,
  gradingDeadline: '2026-12-30',
  minPassingScore: 5.0,
  gradeScaleType: '10',
  maintenanceMode: false,
  sessionTimeoutMinutes: 60,
  allowRegistration: false,
  extraConfigs: {
    gradingRanks: [
      { rank: 'Giỏi', minScore: 8.0, note: 'Điểm TB các môn >= 8.0, không môn nào dưới 6.5' },
      { rank: 'Khá', minScore: 6.5, note: 'Điểm TB các môn >= 6.5, không môn nào dưới 5.0' },
      { rank: 'Trung bình', minScore: 5.0, note: 'Điểm TB các môn >= 5.0, không môn nào dưới 3.5' },
      { rank: 'Yếu', minScore: 0.0, note: 'Điểm TB các môn < 5.0' }
    ],
    availableAcademicYears: ['2024-2025', '2025-2026', '2026-2027', '2027-2028'],
    availableSemesters: [
      { code: 'HK1_2026', name: 'Học kỳ 1 (2026-2027)' },
      { code: 'HK2_2026', name: 'Học kỳ 2 (2026-2027)' }
    ]
  }
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('school');
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data && res.data.data) {
        const data = res.data.data;
        // Format dates for HTML date inputs
        setSettings({
          ...INITIAL_SETTINGS,
          ...data,
          semesterStartDate: data.semesterStartDate ? data.semesterStartDate.slice(0, 10) : '2026-09-05',
          semesterEndDate: data.semesterEndDate ? data.semesterEndDate.slice(0, 10) : '2027-01-15',
          gradingDeadline: data.gradingDeadline ? data.gradingDeadline.slice(0, 10) : '2026-12-30',
        });
      }
    } catch (err) {
      console.warn('Could not fetch settings from backend, using default initial config', err);
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put('/settings', settings);
      
      Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: 'Cài đặt hệ thống đã được cập nhật thành công.',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
      });
      
      setHasChanges(false);
      if (res.data?.data) {
        const data = res.data.data;
        setSettings(prev => ({
          ...prev,
          ...data,
          semesterStartDate: data.semesterStartDate ? data.semesterStartDate.slice(0, 10) : prev.semesterStartDate,
          semesterEndDate: data.semesterEndDate ? data.semesterEndDate.slice(0, 10) : prev.semesterEndDate,
          gradingDeadline: data.gradingDeadline ? data.gradingDeadline.slice(0, 10) : prev.gradingDeadline,
        }));
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      Swal.fire({
        icon: 'error',
        title: 'Thao tác thất bại',
        text: err.response?.data?.message || 'Không thể lưu cài đặt. Vui lòng kiểm tra lại kết nối.',
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const result = await Swal.fire({
      title: 'Khôi phục mặc định?',
      text: 'Toàn bộ cấu hình hệ thống sẽ được đặt lại về thông số chuẩn ban đầu của trường THPT TTLN.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý khôi phục',
      cancelButtonText: 'Hủy bỏ',
      background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
    });

    if (result.isConfirmed) {
      try {
        setSaving(true);
        const res = await api.post('/settings/reset');
        if (res.data?.data) {
          const data = res.data.data;
          setSettings({
            ...INITIAL_SETTINGS,
            ...data,
            semesterStartDate: data.semesterStartDate ? data.semesterStartDate.slice(0, 10) : '2026-09-05',
            semesterEndDate: data.semesterEndDate ? data.semesterEndDate.slice(0, 10) : '2027-01-15',
            gradingDeadline: data.gradingDeadline ? data.gradingDeadline.slice(0, 10) : '2026-12-30',
          });
        } else {
          setSettings(INITIAL_SETTINGS);
        }
        setHasChanges(false);
        Swal.fire({
          icon: 'success',
          title: 'Đã khôi phục',
          text: 'Hệ thống đã chuyển về cấu hình mặc định ban đầu.',
          timer: 2000,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: 'Không thể reset cài đặt: ' + (err.response?.data?.message || err.message),
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      const res = await api.get('/settings/backup');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Backup_THPT_TTLN_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      Swal.fire({
        icon: 'success',
        title: 'Xuất sao lưu thành công!',
        text: 'File bản sao lưu JSON chứa toàn bộ dữ liệu đã được tải về máy của bạn.',
        timer: 2500,
        showConfirmButton: false,
        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
      });
    } catch (err) {
      console.error('Error exporting backup:', err);
      Swal.fire({
        icon: 'error',
        title: 'Xuất sao lưu thất bại',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi tạo bản sao lưu.',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFileSelect = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        if (!parsedData.data) {
          throw new Error('Định dạng file không khớp với bản sao lưu hệ thống THPT TTLN.');
        }

        const confirm = await Swal.fire({
          title: 'Xác nhận khôi phục dữ liệu?',
          html: `File sao lưu ngày: <b>${parsedData.exportedAt ? new Date(parsedData.exportedAt).toLocaleString('vi-VN') : 'Không xác định'}</b><br/>Người xuất: <b>${parsedData.exportedBy || 'Admin'}</b><br/><br/><span class="text-amber-500 font-semibold">Lưu ý: Thao tác này sẽ ghi đè các cấu hình hiện tại!</span>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Bắt đầu Khôi phục',
          cancelButtonText: 'Hủy',
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
        });

        if (confirm.isConfirmed) {
          setRestoring(true);
          const res = await api.post('/settings/restore', { backupData: parsedData });
          Swal.fire({
            icon: 'success',
            title: 'Khôi phục thành công!',
            text: res.data?.message || 'Dữ liệu đã được phục hồi hoàn tất.',
            background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
          });
          fetchSettings();
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'File không hợp lệ',
          text: err.message || 'Không thể đọc file JSON này.',
        });
      } finally {
        setRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  const tabs = [
    { id: 'school', label: 'Thông tin trường học', icon: School, count: null },
    { id: 'academic', label: 'Năm học & Học kỳ', icon: Calendar, count: settings.academicYear },
    { id: 'grading', label: 'Quy chế Điểm số', icon: Award, count: settings.isGradingLocked ? 'Đang khóa' : 'Đang mở' },
    { id: 'security', label: 'Bảo mật & Sao lưu', icon: ShieldCheck, count: settings.maintenanceMode ? 'Bảo trì' : null },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Đang tải cấu hình hệ thống THPT TTLN...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-400/20 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-xs font-semibold rounded-full uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Hệ thống Quản trị v2.5
              </span>
              {settings.maintenanceMode && (
                <span className="px-3 py-1 bg-amber-500/80 backdrop-blur-md text-xs font-bold rounded-full text-white flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chế độ Bảo trì
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Cài đặt hệ thống
            </h1>
            <p className="text-blue-100 text-sm sm:text-base max-w-2xl font-light">
              Thiết lập thông tin trường học, phân kỳ đào tạo, tiêu chuẩn xếp loại học lực & cơ chế an toàn sao lưu dữ liệu toàn trường.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetDefaults}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-sm font-medium rounded-xl backdrop-blur-md border border-white/20 transition-all duration-200 shadow-sm"
              title="Khôi phục về cài đặt mặc định"
            >
              <RotateCcw className="w-4 h-4 text-blue-200" />
              <span>Khôi phục chuẩn</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 active:scale-95 text-sm font-bold rounded-xl shadow-lg shadow-black/10 transition-all duration-200 ${
                hasChanges ? 'ring-4 ring-yellow-400/50 animate-pulse' : ''
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Changes Notification Bar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-800 dark:text-amber-300 text-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Bạn có thay đổi chưa được lưu. Hãy bấm nút <b>"Lưu thay đổi"</b> để cập nhật vào hệ thống.</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-sm transition"
          >
            Lưu ngay
          </button>
        </motion.div>
      )}

      {/* Main Settings Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-left font-semibold">{tab.label}</span>
                  </div>

                  {tab.count && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        tab.count === 'Đang khóa' || tab.count === 'Bảo trì'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick System Status Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3.5 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Trạng thái Cổng thông tin</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Năm học:</span>
                <span className="font-semibold text-blue-300">{settings.academicYear}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Học kỳ:</span>
                <span className="font-semibold text-emerald-300">{settings.currentSemester === 'HK1_2026' ? 'Học kỳ 1' : 'Học kỳ 2'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Nhập điểm:</span>
                <span className={`font-semibold ${settings.isGradingLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {settings.isGradingLocked ? 'Đã khóa' : 'Đang mở'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Phiên làm việc:</span>
                <span className="font-semibold text-purple-300">{settings.sessionTimeoutMinutes} phút</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {/* TAB 1: SCHOOL INFO */}
            {activeTab === 'school' && (
              <motion.div
                key="school"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Live Preview Card */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 flex-shrink-0 border-2 border-white/20">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <School className="w-10 h-10 text-white" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-500/30 text-blue-300 text-xs font-mono font-bold tracking-wide border border-blue-400/30">
                          {settings.schoolCode || 'THPT-TTLN'}
                        </span>
                        <span className="text-xs text-slate-400">Xem trước thẻ nhận diện trường học</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        {settings.schoolName || 'Trường THPT TTLN'}
                      </h2>
                      <p className="text-indigo-200 text-sm italic font-light">
                        "{settings.slogan || 'Ươm mầm tri thức - Vững bước tương lai'}"
                      </p>
                      <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-300 pt-2">
                        <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-blue-400" /> HT: {settings.principalName}</span>
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {settings.phone}</span>
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-amber-400" /> {settings.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Thông tin Hành chính & Liên hệ
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Các thông tin này sẽ được in trên phiếu điểm, bảng học phí và hiển thị ở tiêu đề giao diện học sinh, giáo viên.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Tên Trường học *
                      </label>
                      <input
                        type="text"
                        value={settings.schoolName}
                        onChange={(e) => handleChange('schoolName', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: Trường THPT TTLN"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Mã Định danh Trường (School Code) *
                      </label>
                      <input
                        type="text"
                        value={settings.schoolCode}
                        onChange={(e) => handleChange('schoolCode', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: THPT-TTLN"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Hiệu trưởng / Đại diện *
                      </label>
                      <input
                        type="text"
                        value={settings.principalName}
                        onChange={(e) => handleChange('principalName', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: ThS. Nguyễn Văn Quản"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Khẩu hiệu / Slogan Trường
                      </label>
                      <input
                        type="text"
                        value={settings.slogan}
                        onChange={(e) => handleChange('slogan', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: Ươm mầm tri thức - Vững bước tương lai"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Hotline / Điện thoại *
                      </label>
                      <input
                        type="text"
                        value={settings.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: 028.3899.9999"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Hòm thư Điện tử (Email) *
                      </label>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: contact@thpt-ttln.edu.vn"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Địa chỉ Trường học *
                      </label>
                      <input
                        type="text"
                        value={settings.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="VD: 123 Đường Giáo Dục, TP. Hồ Chí Minh"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Website chính thức
                      </label>
                      <input
                        type="url"
                        value={settings.website}
                        onChange={(e) => handleChange('website', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="https://thpt-ttln.edu.vn"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Đường dẫn Logo URL
                      </label>
                      <input
                        type="text"
                        value={settings.logoUrl}
                        onChange={(e) => handleChange('logoUrl', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition"
                        placeholder="https://domain.com/logo.png (hoặc để trống)"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: ACADEMIC YEAR & SEMESTERS */}
            {activeTab === 'academic' && (
              <motion.div
                key="academic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      Thiết lập Năm học & Học kỳ Hoạt động
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Xác định niên khóa và học kỳ vận hành mặc định cho bảng điểm, thời khóa biểu và điểm danh trên toàn hệ thống.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Năm học Hiện tại *
                      </label>
                      <select
                        value={settings.academicYear}
                        onChange={(e) => handleChange('academicYear', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition"
                      >
                        <option value="2024-2025">Năm học 2024 - 2025</option>
                        <option value="2025-2026">Năm học 2025 - 2026</option>
                        <option value="2026-2027">Năm học 2026 - 2027 (Hiện tại)</option>
                        <option value="2027-2028">Năm học 2027 - 2028</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Học kỳ Đang Mở *
                      </label>
                      <select
                        value={settings.currentSemester}
                        onChange={(e) => handleChange('currentSemester', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition"
                      >
                        <option value="HK1_2026">Học kỳ 1 (HK1)</option>
                        <option value="HK2_2026">Học kỳ 2 (HK2)</option>
                        <option value="SUMMER_2026">Học kỳ Hè (Khảo sát/Phụ đạo)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Ngày Bắt đầu Học kỳ
                      </label>
                      <input
                        type="date"
                        value={settings.semesterStartDate}
                        onChange={(e) => handleChange('semesterStartDate', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Ngày Kết thúc Học kỳ
                      </label>
                      <input
                        type="date"
                        value={settings.semesterEndDate}
                        onChange={(e) => handleChange('semesterEndDate', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition"
                      />
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">Khối 10 (Chương trình mới)</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">Lớp 10A1 - 10A5</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Đăng ký môn tự chọn</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-1">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Khối 11</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">Lớp 11A1 - 11A6</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Học kỳ trọng tâm</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-1">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Khối 12 (Tốt nghiệp)</span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">Lớp 12A1 - 12A8</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ôn thi tốt nghiệp THPT</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: GRADING RULES */}
            {activeTab === 'grading' && (
              <motion.div
                key="grading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Grading Lock Controls */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      Quy chế Nhập điểm & Thời hạn Học vụ
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Điều khiển quyền cập nhật điểm của giáo viên bộ môn và hạn chót tổng kết học kỳ.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Toggle Lock */}
                    <div className={`p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                      settings.isGradingLocked
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {settings.isGradingLocked ? (
                            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span className="font-bold text-sm text-slate-800 dark:text-white">
                            Khóa Cổng Nhập Điểm
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                          {settings.isGradingLocked
                            ? 'Giáo viên hiện KHÔNG thể chỉnh sửa điểm học sinh.'
                            : 'Cổng nhập điểm đang MỞ cho giáo viên bộ môn.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleChange('isGradingLocked', !settings.isGradingLocked)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.isGradingLocked ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.isGradingLocked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Deadline */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Hạn Chót Giáo Viên Nộp Điểm
                      </label>
                      <input
                        type="date"
                        value={settings.gradingDeadline}
                        onChange={(e) => handleChange('gradingDeadline', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium transition"
                      />
                      <span className="text-xs text-slate-400 mt-1 block">
                        Sau thời gian này, hệ thống sẽ tự động chuyển cổng sang trạng thái khóa.
                      </span>
                    </div>
                  </div>

                  {/* Standard Grade Classification Table */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Quy chuẩn Xếp loại Học lực (Bộ GD&ĐT)
                    </h4>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3.5">Xếp loại</th>
                            <th className="p-3.5">Điểm sàn (GPA)</th>
                            <th className="p-3.5">Tiêu chuẩn môn thành phần</th>
                            <th className="p-3.5 text-center">Trạng thái áp dụng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Giỏi / Xuất sắc</td>
                            <td className="p-3.5 font-semibold">≥ 8.0 / 10.0</td>
                            <td className="p-3.5">Toán/Văn/Ngoại ngữ ≥ 8.0, không môn nào &lt; 6.5</td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">Bắt buộc</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">Khá</td>
                            <td className="p-3.5 font-semibold">≥ 6.5 / 10.0</td>
                            <td className="p-3.5">Toán/Văn/Ngoại ngữ ≥ 6.5, không môn nào &lt; 5.0</td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">Bắt buộc</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">Trung bình</td>
                            <td className="p-3.5 font-semibold">≥ 5.0 / 10.0</td>
                            <td className="p-3.5">Toán/Văn/Ngoại ngữ ≥ 5.0, không môn nào &lt; 3.5</td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium">Bắt buộc</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">Yếu / Chưa đạt</td>
                            <td className="p-3.5 font-semibold">&lt; 5.0 / 10.0</td>
                            <td className="p-3.5">Điểm tổng kết &lt; 5.0 hoặc có môn dưới 3.5</td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">Bắt buộc</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: SECURITY & BACKUP */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Security Settings Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Cài đặt An toàn & Phiên làm việc
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Cấu hình các chính sách bảo mật dữ liệu và kiểm soát truy cập cổng đào tạo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Maintenance Mode */}
                    <div className={`p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                      settings.maintenanceMode
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-5 h-5 ${settings.maintenanceMode ? 'text-rose-600' : 'text-slate-500'}`} />
                          <span className="font-bold text-sm text-slate-800 dark:text-white">
                            Chế độ Bảo trì (Maintenance)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                          {settings.maintenanceMode
                            ? 'Hệ thống đang tạm ngừng để nâng cấp. Chỉ Admin có thể đăng nhập.'
                            : 'Cổng thông tin đang hoạt động bình thường.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Session Timeout */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Thời hạn Phiên đăng nhập (Session Timeout)
                      </label>
                      <select
                        value={settings.sessionTimeoutMinutes}
                        onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition"
                      >
                        <option value={30}>30 phút (Khuyến nghị cho nơi công cộng)</option>
                        <option value={60}>60 phút (Tiêu chuẩn 1 giờ)</option>
                        <option value={120}>120 phút (2 giờ)</option>
                        <option value={240}>240 phút (4 giờ)</option>
                        <option value={1440}>24 giờ (Dành cho thiết bị cá nhân)</option>
                      </select>
                      <span className="text-xs text-slate-400 mt-1 block">
                        Tự động hủy token khi không phát sinh thao tác trong thời gian quy định.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Backup & Restore Action Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 space-y-6">
                  <div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider border border-emerald-400/30">
                      Disaster Recovery
                    </span>
                    <h3 className="text-xl font-bold mt-2 text-white flex items-center gap-2">
                      <Server className="w-5 h-5 text-emerald-400" />
                      Sao lưu & Khôi phục Dữ liệu Toàn Trường
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl">
                      Xuất toàn bộ cơ sở dữ liệu gồm danh sách học sinh, giáo viên, bảng điểm, thời khóa biểu, lịch thi và học phí thành định dạng JSON chuẩn. Có thể khôi phục lại bất kỳ lúc nào.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Export Action */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
                          <FileJson className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">Xuất File Sao Lưu (.json)</h4>
                          <p className="text-xs text-slate-400">Tải về toàn bộ cơ sở dữ liệu</p>
                        </div>
                      </div>

                      <button
                        onClick={handleExportBackup}
                        disabled={exporting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold rounded-xl text-xs transition duration-150 shadow-md shadow-blue-600/30"
                      >
                        {exporting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Đang đóng gói dữ liệu...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Tải bản sao lưu ngay</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Restore Action */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">Khôi phục Dữ liệu</h4>
                          <p className="text-xs text-slate-400">Tải lên file sao lưu đã lưu trữ</p>
                        </div>
                      </div>

                      <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleRestoreFileSelect}
                        className="hidden"
                      />

                      <button
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        disabled={restoring}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-semibold rounded-xl text-xs transition duration-150 border border-slate-600"
                      >
                        {restoring ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Đang kiểm tra & nạp dữ liệu...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Chọn file .json khôi phục</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Settings;
