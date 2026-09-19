import React from 'react';
import { RefreshCw, AlertTriangle, Home, LogOut } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary bắt được lỗi:', error, errorInfo);
  }

  handleReload = () => {
    // Xóa cờ retry trước khi tải lại chủ động
    window.sessionStorage.removeItem('chunk_retry_refreshed');
    window.location.reload();
  };

  handleGoHome = () => {
    window.sessionStorage.removeItem('chunk_retry_refreshed');
    window.location.href = '/';
  };

  handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    window.sessionStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk');

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              {isChunkError ? 'Đã có bản cập nhật mới' : 'Có sự cố xảy ra'}
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              {isChunkError 
                ? 'Hệ thống vừa cập nhật phiên bản mới. Vui lòng tải lại trang để nạp giao diện và dữ liệu mới nhất.' 
                : 'Trình duyệt không thể nạp hoàn tất trang này. Vui lòng tải lại trang hoặc quay về trang chủ.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại trang
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Trang chủ
              </button>

              <button
                onClick={this.handleLogout}
                className="w-full sm:w-auto px-3 py-2.5 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Đăng xuất và xóa phiên"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng nhập lại
              </button>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="mt-6 text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs text-rose-600 dark:text-rose-400 font-mono">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
