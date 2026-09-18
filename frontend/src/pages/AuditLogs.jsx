import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Filter,
  X,
  Search,
  Clock,
  User,
  Globe,
  Database,
  Activity,
  RefreshCw
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const today = new Date();
const fmt = (offsetMinutes) => {
  const d = new Date(today.getTime() - offsetMinutes * 60 * 1000);
  return d.toISOString();
};

const MOCK_LOGS = [
  {
    id: '1', action: 'GRADE_EDIT', resourceType: 'Grade', resourceId: 'grade-001',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'warning', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Sửa điểm môn Toán HK1 theo yêu cầu phúc khảo số PK-2024-089',
    oldValue: { score: 7.5, enteredBy: 'gv.nguyen', lockedAt: '2024-12-01' },
    newValue: { score: 8.0, enteredBy: 'gv.nguyen', updatedBy: 'admin', lockedAt: '2024-12-01' },
    createdAt: fmt(5)
  },
  {
    id: '2', action: 'LOGIN', resourceType: 'auth', resourceId: null,
    user: { username: 'gv.nguyen', email: 'nguyen@thptttln.edu.vn', role: 'teacher' },
    severity: 'info', ipAddress: '192.168.1.42', userAgent: 'Mozilla/5.0 Firefox/121',
    reason: null, oldValue: null, newValue: { loginAt: fmt(22) },
    createdAt: fmt(22)
  },
  {
    id: '3', action: 'SUSPEND_USER', resourceType: 'User', resourceId: 'user-047',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'critical', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Tài khoản vi phạm nội quy: đăng nhập từ nhiều IP lạ liên tiếp',
    oldValue: { status: 'active' }, newValue: { status: 'suspended', suspendedAt: fmt(35) },
    createdAt: fmt(35)
  },
  {
    id: '4', action: 'GRADE_OVERRIDE', resourceType: 'Grade', resourceId: 'grade-089',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'warning', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Override điểm Văn HK2 — sai sót nhập liệu của giáo viên nghỉ phép dài hạn',
    oldValue: { score: null, status: 'pending' }, newValue: { score: 6.8, status: 'finalized', override: true },
    createdAt: fmt(55)
  },
  {
    id: '5', action: 'ROLE_ASSIGN', resourceType: 'Role', resourceId: 'user-012',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'warning', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Bổ nhiệm Tổ trưởng chuyên môn theo quyết định số 45/QĐ-BGH',
    oldValue: { roles: ['subject_teacher'] }, newValue: { roles: ['subject_teacher', 'homeroom_teacher'] },
    createdAt: fmt(78)
  },
  {
    id: '6', action: 'VIEW_SENSITIVE_PROFILE', resourceType: 'student_profile', resourceId: 'student-102',
    user: { username: 'gv.tran', email: 'tran@thptttln.edu.vn', role: 'teacher' },
    severity: 'info', ipAddress: '192.168.1.15', userAgent: 'Mozilla/5.0 Safari/17',
    reason: null, oldValue: null, newValue: { viewedFields: ['healthRecord', 'disabilityStatus'] },
    createdAt: fmt(95)
  },
  {
    id: '7', action: 'EXPORT_BATCH', resourceType: 'export', resourceId: null,
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'info', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Xuất báo cáo danh sách học sinh toàn trường gửi Sở GD&ĐT',
    oldValue: null, newValue: { exportType: 'student_list', totalRows: 1247, format: 'xlsx' },
    createdAt: fmt(120)
  },
  {
    id: '8', action: 'ATTENDANCE_LOCK', resourceType: 'attendance', resourceId: 'attend-12B-20241215',
    user: { username: 'gv.le', email: 'le@thptttln.edu.vn', role: 'teacher' },
    severity: 'info', ipAddress: '192.168.1.88', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: null, oldValue: { status: 'open' }, newValue: { status: 'locked', lockedAt: fmt(145) },
    createdAt: fmt(145)
  },
  {
    id: '9', action: 'PASSWORD_RESET', resourceType: 'User', resourceId: 'user-033',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'warning', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Reset mật khẩu theo yêu cầu qua email xác thực',
    oldValue: { passwordLastChanged: '2024-01-15' }, newValue: { passwordLastChanged: fmt(160), forceChange: true },
    createdAt: fmt(160)
  },
  {
    id: '10', action: 'TUITION_WAIVE', resourceType: 'tuition', resourceId: 'fee-bill-2024-089',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'critical', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Miễn giảm học phí 100% cho học sinh diện hộ nghèo theo QĐ số 78/2024',
    oldValue: { amount: 4500000, status: 'unpaid', discount: 0 },
    newValue: { amount: 4500000, status: 'waived', discount: 100, waivedBy: 'admin' },
    createdAt: fmt(185)
  },
  {
    id: '11', action: 'CONDUCT_DISCIPLINE', resourceType: 'conduct', resourceId: 'student-055',
    user: { username: 'gv.pham', email: 'pham@thptttln.edu.vn', role: 'teacher' },
    severity: 'critical', ipAddress: '192.168.1.20', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Ghi nhận kỷ luật cảnh cáo: vi phạm nội quy sử dụng điện thoại trong giờ học lần 3',
    oldValue: { conductScore: 85, violations: 2 }, newValue: { conductScore: 70, violations: 3, disciplineType: 'caution' },
    createdAt: fmt(210)
  },
  {
    id: '12', action: 'LOGOUT', resourceType: 'auth', resourceId: null,
    user: { username: 'gv.hoang', email: 'hoang@thptttln.edu.vn', role: 'teacher' },
    severity: 'info', ipAddress: '192.168.1.77', userAgent: 'Mozilla/5.0 Firefox/121',
    reason: null, oldValue: null, newValue: { logoutAt: fmt(230) },
    createdAt: fmt(230)
  },
  {
    id: '13', action: 'LESSON_LOG_EDIT', resourceType: 'lesson_log', resourceId: 'log-10B-20241214',
    user: { username: 'gv.nguyen', email: 'nguyen@thptttln.edu.vn', role: 'teacher' },
    severity: 'info', ipAddress: '192.168.1.42', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Sửa nội dung sổ đầu bài — bổ sung phần nhận xét lớp học',
    oldValue: { teacherNote: '' }, newValue: { teacherNote: 'Lớp học tập nghiêm túc, đã hoàn thành bài §3.2' },
    createdAt: fmt(260)
  },
  {
    id: '14', action: 'SYSTEM_CONFIG_CHANGE', resourceType: 'system', resourceId: null,
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'critical', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Mở cửa sổ nhập điểm HK1 năm học 2024-2025 theo lịch biểu BGH',
    oldValue: { gradingWindow: { semester: 'HK1', status: 'locked' } },
    newValue: { gradingWindow: { semester: 'HK1', status: 'open', openedAt: fmt(285) } },
    createdAt: fmt(285)
  },
  {
    id: '15', action: 'PETITION_APPROVE', resourceType: 'petition', resourceId: 'petition-2024-034',
    user: { username: 'admin', email: 'admin@thptttln.edu.vn', role: 'admin' },
    severity: 'info', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Chrome/126',
    reason: 'Duyệt đơn xin nghỉ phép của học sinh Nguyễn Văn An — có giấy xác nhận bệnh viện',
    oldValue: { petitionStatus: 'pending' }, newValue: { petitionStatus: 'approved', approvedBy: 'admin' },
    createdAt: fmt(300)
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_OPTIONS = [
  'Tất cả', 'GRADE_EDIT', 'GRADE_OVERRIDE', 'LOGIN', 'LOGOUT',
  'SUSPEND_USER', 'ROLE_ASSIGN', 'VIEW_SENSITIVE_PROFILE',
  'EXPORT_BATCH', 'ATTENDANCE_LOCK', 'PASSWORD_RESET',
  'TUITION_WAIVE', 'CONDUCT_DISCIPLINE', 'LESSON_LOG_EDIT',
  'SYSTEM_CONFIG_CHANGE', 'PETITION_APPROVE'
];

const MODULE_OPTIONS = [
  'Tất cả', 'Grade', 'auth', 'User', 'Role', 'student_profile',
  'export', 'attendance', 'tuition', 'conduct', 'lesson_log', 'system', 'petition'
];

const SEVERITY_CONFIG = {
  info: {
    label: 'INFO',
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    dot: 'bg-blue-500'
  },
  warning: {
    label: 'CẢNH BÁO',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-500'
  },
  critical: {
    label: 'NGHIÊM TRỌNG',
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    dot: 'bg-red-500 animate-pulse'
  }
};

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (iso) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { date, time };
};

const truncateIP = (ip) => {
  if (!ip) return '—';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.slice(0, 12) + '…';
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, colorClass, borderClass }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex items-center gap-4 bg-white border ${borderClass} rounded-xl px-5 py-4 shadow-sm`}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 shrink-0`}>
      <Icon size={20} className={colorClass} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  </motion.div>
);

const SeverityBadge = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

const JsonPanel = ({ label, data, colorClass }) => (
  <div className="flex-1 min-w-0">
    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${colorClass}`}>{label}</p>
    <pre className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
      {data !== null && data !== undefined ? JSON.stringify(data, null, 2) : '—'}
    </pre>
  </div>
);

const ExpandedRow = ({ log }) => (
  <motion.tr
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18 }}
  >
    <td colSpan={8} className="px-0 pb-0">
      <div className="mx-2 mb-2 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        {/* Reason */}
        {log.reason && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">Lý do:</span>
            <p className="text-xs text-slate-700 italic">&ldquo;{log.reason}&rdquo;</p>
          </div>
        )}

        {/* JSON Diff */}
        <div className="flex gap-3">
          <JsonPanel label="Trước (Old Value)" data={log.oldValue} colorClass="text-red-600" />
          <div className="flex items-center text-slate-400 shrink-0 mt-5 text-lg">→</div>
          <JsonPanel label="Sau (New Value)" data={log.newValue} colorClass="text-emerald-600" />
        </div>

        {/* Extra meta */}
        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-200">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Globe size={10} /> IP đầy đủ: <span className="text-slate-700 font-mono ml-1">{log.ipAddress || '—'}</span>
          </span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Database size={10} /> Resource ID: <span className="text-slate-700 font-mono ml-1">{log.resourceId || '—'}</span>
          </span>
          {log.user?.email && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <User size={10} /> Email: <span className="text-slate-700 ml-1">{log.user.email}</span>
            </span>
          )}
        </div>
      </div>
    </td>
  </motion.tr>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuditLogs() {
  const [filters, setFilters] = useState({
    action: 'Tất cả',
    module: 'Tất cả',
    fromDate: '',
    toDate: '',
    username: ''
  });
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  // Today stats
  const todayStr = today.toISOString().slice(0, 10);
  const todayLogs = MOCK_LOGS.filter(l => l.createdAt.slice(0, 10) === todayStr);
  const todayTotal = todayLogs.length;
  const todayWarnings = todayLogs.filter(l => l.severity === 'warning').length;
  const todayCritical = todayLogs.filter(l => l.severity === 'critical').length;

  // Filter logic
  const filtered = useMemo(() => {
    return MOCK_LOGS.filter(log => {
      if (filters.action !== 'Tất cả' && log.action !== filters.action) return false;
      if (filters.module !== 'Tất cả' && log.resourceType !== filters.module) return false;
      if (filters.username && !log.user?.username?.toLowerCase().includes(filters.username.toLowerCase())) return false;
      if (filters.fromDate && log.createdAt < filters.fromDate) return false;
      if (filters.toDate && log.createdAt > filters.toDate + 'T23:59:59') return false;
      return true;
    });
  }, [filters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);
    setExpandedId(null);
  };

  const clearFilters = () => {
    setFilters({ action: 'Tất cả', module: 'Tất cả', fromDate: '', toDate: '', username: '' });
    setPage(1);
    setExpandedId(null);
  };

  const hasActiveFilters =
    filters.action !== 'Tất cả' ||
    filters.module !== 'Tất cả' ||
    filters.fromDate !== '' ||
    filters.toDate !== '' ||
    filters.username !== '';

  const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 md:px-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nhật ký hệ thống</h1>
            <p className="text-xs text-slate-500">Audit Logs — Theo dõi mọi thao tác nhạy cảm trên hệ thống</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Tổng logs hôm nay"
          value={todayTotal}
          icon={Activity}
          colorClass="text-blue-400"
          borderClass="border-blue-500/20"
        />
        <StatCard
          label="Cảnh báo hôm nay"
          value={todayWarnings}
          icon={AlertTriangle}
          colorClass="text-amber-400"
          borderClass="border-amber-500/20"
        />
        <StatCard
          label="Nghiêm trọng hôm nay"
          value={todayCritical}
          icon={AlertCircle}
          colorClass="text-red-400"
          borderClass="border-red-500/20"
        />
      </div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bộ lọc</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <X size={12} /> Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Action */}
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-medium">Hành động</label>
            <select
              value={filters.action}
              onChange={e => setFilter('action', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-medium">Tài nguyên</label>
            <select
              value={filters.module}
              onChange={e => setFilter('module', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* From date */}
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-medium">Từ ngày</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={e => setFilter('fromDate', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* To date */}
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-medium">Đến ngày</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={e => setFilter('toDate', e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Username search */}
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 font-medium">Người thực hiện</label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="username..."
                value={filters.username}
                onChange={e => setFilter('username', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
      >
        {/* Table meta header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-xs text-slate-500">
            Hiển thị{' '}
            <span className="text-slate-800 font-semibold">
              {filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </span>{' '}
            trong tổng số <span className="text-slate-800 font-semibold">{filtered.length}</span> logs
          </span>
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RefreshCw size={12} /> Làm mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="px-3 py-3 text-left w-10">#</th>
                <th className="px-3 py-3 text-left min-w-[130px]">
                  <div className="flex items-center gap-1"><Clock size={10} /> Thời gian</div>
                </th>
                <th className="px-3 py-3 text-left min-w-[155px]">Hành động</th>
                <th className="px-3 py-3 text-left min-w-[115px]">Tài nguyên</th>
                <th className="px-3 py-3 text-left min-w-[115px]">
                  <div className="flex items-center gap-1"><User size={10} /> Người TH</div>
                </th>
                <th className="px-3 py-3 text-left min-w-[115px]">Mức độ</th>
                <th className="px-3 py-3 text-left min-w-[90px]">
                  <div className="flex items-center gap-1"><Globe size={10} /> IP</div>
                </th>
                <th className="px-3 py-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                    <Shield size={32} className="mx-auto mb-3 opacity-30" />
                    Không tìm thấy log nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                pageData.map((log, idx) => {
                  const { date, time } = formatDateTime(log.createdAt);
                  const isExpanded = expandedId === log.id;
                  const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                  const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;

                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => toggleExpand(log.id)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isExpanded ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* # */}
                        <td className="px-3 py-3 text-slate-400 font-mono">{rowNum}</td>

                        {/* Thời gian */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-medium">{time}</span>
                            <span className="text-slate-400 text-[10px]">{date}</span>
                          </div>
                        </td>

                        {/* Hành động */}
                        <td className="px-3 py-3">
                          <span className="font-mono text-indigo-600 font-semibold text-[11px]">{log.action}</span>
                        </td>

                        {/* Tài nguyên */}
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">
                            {log.resourceType}
                          </span>
                        </td>

                        {/* Người thực hiện */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            <span className="text-slate-800 font-medium">{log.user?.username || '—'}</span>
                          </div>
                          <span className="text-slate-400 text-[10px] pl-3">{log.user?.role}</span>
                        </td>

                        {/* Mức độ */}
                        <td className="px-3 py-3">
                          <SeverityBadge severity={log.severity} />
                        </td>

                        {/* IP */}
                        <td className="px-3 py-3">
                          <span className="font-mono text-slate-500 text-[10px]">{truncateIP(log.ipAddress)}</span>
                        </td>

                        {/* Expand toggle */}
                        <td className="px-3 py-3 text-center">
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.18 }}
                            className="inline-block"
                          >
                            <ChevronRight size={15} className="text-slate-400" />
                          </motion.div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      <AnimatePresence>
                        {isExpanded && <ExpandedRow key={`exp-${log.id}`} log={log} />}
                      </AnimatePresence>
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Trước
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '...' ? (
                    <span key={`ellipsis-${i}`} className="text-slate-400 text-xs px-1">…</span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      onClick={() => setPage(item)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        page === item
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Tiếp →
            </button>
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 px-1">
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Icon size={10} className={cfg.text} />
              <span>{cfg.label}</span>
            </div>
          );
        })}
        <span className="text-[10px] text-slate-400 ml-auto">Click vào dòng để xem chi tiết JSON diff</span>
      </div>
    </div>
  );
}
