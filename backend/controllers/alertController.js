import EarlyWarningService from '../services/earlyWarningService.js';

/**
 * Lấy danh sách cảnh báo có phân quyền
 */
export const getAlerts = async (req, res) => {
  try {
    const { classId, alertType, severity, status, page, limit } = req.query;
    const result = await EarlyWarningService.getAlerts({
      userRole: req.user?.role,
      userId: req.user?.id,
      classId,
      alertType,
      severity,
      status,
      page,
      limit
    });

    res.json({
      success: true,
      data: result.alerts,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error in getAlerts controller:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách cảnh báo' });
  }
};

/**
 * Kích hoạt quét rủi ro sớm toàn trường (Admin / BGH)
 */
export const triggerScan = async (req, res) => {
  try {
    const scanResults = await EarlyWarningService.runFullScan();
    res.json({
      success: true,
      message: 'Đã hoàn thành quét rủi ro học đường',
      data: scanResults
    });
  } catch (error) {
    console.error('Error triggering early warning scan:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi kích hoạt quét cảnh báo' });
  }
};

/**
 * Đánh dấu đã giải quyết cảnh báo
 */
export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;

    const updated = await EarlyWarningService.resolveAlert(id, req.user?.id, resolutionNote);
    res.json({
      success: true,
      message: 'Đã xử lý cảnh báo thành công',
      data: updated
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý cảnh báo' });
  }
};
