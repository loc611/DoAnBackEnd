/**
 * Tự động thử lại khi tải dynamic import chunk bị thất bại (404 stale chunk sau khi deploy/build mới)
 * 
 * Quy trình xử lý:
 * 1. Khi Vite build mới, các hash của chunk JS thay đổi.
 * 2. Nếu tab trình duyệt cũ cố nạp chunk đã bị thay thế (HTTP 404), hàm này sẽ phát hiện lỗi.
 * 3. Tự động gọi window.location.reload() 1 lần để tải lại file index.html mới nhất.
 * 4. Sử dụng sessionStorage để kiểm soát, ngăn chặn việc tải lại vô hạn (infinite loop).
 */
export function lazyRetry(componentImport) {
  return new Promise((resolve, reject) => {
    const hasRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_retry_refreshed') || 'false'
    );

    componentImport()
      .then((component) => {
        // Tải thành công -> xóa trạng thái để các lần sau tiếp tục hoạt động
        window.sessionStorage.setItem('chunk_retry_refreshed', 'false');
        resolve(component);
      })
      .catch((error) => {
        const isDynamicImportError = 
          error?.message?.includes('Failed to fetch dynamically imported module') ||
          error?.name === 'TypeError' ||
          error?.message?.includes('dynamically imported module') ||
          error?.message?.includes('Loading chunk');

        if (!hasRefreshed && isDynamicImportError) {
          window.sessionStorage.setItem('chunk_retry_refreshed', 'true');
          window.location.reload();
          return;
        }

        console.error('Lỗi khi nạp dynamic module:', error);
        reject(error);
      });
  });
}

export default lazyRetry;
