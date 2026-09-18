import React, { useState, useEffect } from 'react';
import { 
  X, History, ShieldAlert, CheckCircle, Clock, 
  AlertTriangle, Filter, Search, User, Globe, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const AuditLogDrawer = ({ isOpen, onClose, teacher }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, teacher]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const userId = teacher?.user?.id || teacher?.userId || teacher?.id;
      const res = await api.get('/audit-logs', {
        params: {
          userId: userId !== 'all' ? userId : undefined,
          limit: 30
        }
      });
      const data = res.data?.data?.logs || res.data?.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải nhật ký hoạt động:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterModule === 'all') return true;
    return log.resourceType === filterModule || log.action?.toLowerCase().includes(filterModule);
  });

  const getActionBadge = (action, severity) => {
    if (action?.includes('STATUS') || action?.includes('LOCK')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action?.includes('grade') || action?.includes('GRADE')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (action?.includes('assignment')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          {/* Backdrop Click */}
          <div className="flex-1" onClick={onClose} />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                    Nhật ký hoạt động (Audit Log)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {teacher ? `Cán bộ: ${teacher.fullName || teacher.profile?.fullName}` : 'Toàn bộ hệ thống'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                onClick={() => setFilterModule('all')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  filterModule === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({logs.length})
              </button>
              <button
                onClick={() => setFilterModule('grade')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  filterModule === 'grade' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sửa điểm
              </button>
              <button
                onClick={() => setFilterModule('auth')}
                className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                  filterModule === 'auth' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tài khoản &amp; Khóa
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 font-medium">Đang tải lịch sử kiểm toán...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Clock size={36} className="mx-auto text-slate-300" />
                  <p className="text-sm font-medium">Chưa có nhật ký hoạt động nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
                  {filteredLogs.map(log => {
                    const timeStr = new Date(log.createdAt).toLocaleString('vi-VN', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    });

                    return (
                      <div key={log.id} className="relative flex items-start gap-3 pl-8 group">
                        {/* Dot */}
                        <div className="absolute left-2.5 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50 group-hover:scale-125 transition-transform" />

                        <div className="flex-1 bg-slate-50 hover:bg-indigo-50/40 p-3.5 rounded-2xl border border-slate-100 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getActionBadge(log.action, log.severity)}`}>
                              {log.action}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock size={11} /> {timeStr}
                            </span>
                          </div>

                          {log.reason && (
                            <p className="text-xs text-slate-700 font-medium mb-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                              <span className="font-bold text-slate-500">Lý do:</span> {log.reason}
                            </p>
                          )}

                          {/* Diffs (Old -> New) */}
                          {(log.oldValue || log.newValue) && (
                            <div className="text-[11px] font-mono bg-white p-2 rounded-xl border border-slate-200/80 text-slate-600 flex items-center justify-between overflow-x-auto">
                              <div>
                                <span className="text-slate-400">Cũ: </span>
                                <span className="text-rose-600 font-bold">{JSON.stringify(log.oldValue || '-')}</span>
                              </div>
                              <ArrowRight size={12} className="text-slate-400 mx-2 shrink-0" />
                              <div>
                                <span className="text-slate-400">Mới: </span>
                                <span className="text-emerald-600 font-bold">{JSON.stringify(log.newValue || '-')}</span>
                              </div>
                            </div>
                          )}

                          {/* IP & Metadata */}
                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Globe size={11} /> IP: {log.ipAddress || '127.0.0.1'}
                            </span>
                            <span>Mức độ: <b className="uppercase">{log.severity || 'info'}</b></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Đóng nhật ký
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuditLogDrawer;
