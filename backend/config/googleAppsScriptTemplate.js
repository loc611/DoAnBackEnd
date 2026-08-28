// Google Apps Script Template code for managing Student List
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script Webhook cho Quản Lý Học Sinh
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet của bạn -> Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa hết mã cũ trong tệp Code.gs và dán toàn bộ đoạn mã này vào.
 * 3. Bấm nút "Lưu" (Biểu tượng đĩa mềm hoặc Ctrl + S).
 * 4. Bấm nút "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: "Student Sync Webhook"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Người có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 6. Bấm "Triển khai" (Deploy) -> Cấp quyền truy cập nếu được yêu cầu.
 * 7. Sao chép "URL ứng dụng web" (Web App URL) và dán vào phần Cài đặt Google Sheet trên phần mềm!
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = getSheetDataAsJson(sheet);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: data.length,
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    
    var action = payload.action || 'syncToSheet';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (action === 'getStudents') {
      var data = getSheetDataAsJson(sheet);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        count: data.length,
        data: data
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'exportStudents' || action === 'syncToSheet') {
      var students = payload.students || [];
      writeStudentsToSheet(sheet, students);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Đã xuất ' + students.length + ' học sinh lên Google Sheet thành công!',
        count: students.length
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hành động không hợp lệ: ' + action
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataAsJson(sheet) {
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var normalizedHeaders = headers.map(normalizeHeader);
  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var isEmpty = row.every(function(val) { return val === "" || val === null || val === undefined; });
    if (isEmpty) continue;

    var student = {};
    for (var j = 0; j < headers.length; j++) {
      var key = normalizedHeaders[j];
      var rawVal = row[j];

      // Format Date object if needed
      if (rawVal instanceof Date) {
        var y = rawVal.getFullYear();
        var m = ('0' + (rawVal.getMonth() + 1)).slice(-2);
        var d = ('0' + rawVal.getDate()).slice(-2);
        rawVal = y + '-' + m + '-' + d;
      } else if (rawVal !== undefined && rawVal !== null) {
        rawVal = String(rawVal).trim();
      }

      if (key) {
        student[key] = rawVal;
      }
    }
    if (student.studentCode) {
      result.push(student);
    }
  }
  return result;
}

function normalizeHeader(header) {
  if (!header) return '';
  var text = String(header).toLowerCase().trim();
  
  if (text.includes('mã') || text.includes('ma hs') || text.includes('code') || text.includes('studentcode')) return 'studentCode';
  if (text.includes('họ') || text.includes('tên') || text.includes('name') || text.includes('fullname')) return 'fullName';
  if (text.includes('tính') || text.includes('gender') || text.includes('gioi')) return 'gender';
  if (text.includes('lớp') || text.includes('class') || text.includes('lop')) return 'className';
  if (text.includes('sinh') || text.includes('dob') || text.includes('birth')) return 'dateOfBirth';
  if (text.includes('phụ huynh') || text.includes('parent') || text.includes('sđt ph')) return 'parentPhone';
  if (text.includes('điện thoại') || text.includes('phone') || text.includes('sđt') || text.includes('sdt')) return 'phone';
  if (text.includes('chỉ') || text.includes('address') || text.includes('dia chi')) return 'address';
  if (text.includes('thái') || text.includes('status')) return 'status';
  return text;
}

function writeStudentsToSheet(sheet, students) {
  var headers = [
    'Mã Học Sinh',
    'Họ Và Tên',
    'Giới Tính',
    'Lớp',
    'Ngày Sinh',
    'Số Điện Thoại',
    'SĐT Phụ Huynh',
    'Địa Chỉ',
    'Trạng Thái'
  ];

  sheet.clear();
  
  var rows = [headers];
  students.forEach(function(s) {
    var dob = s.dateOfBirth ? (typeof s.dateOfBirth === 'string' ? s.dateOfBirth.split('T')[0] : s.dateOfBirth) : '';
    rows.push([
      s.studentCode || '',
      s.fullName || '',
      s.gender || 'Nam',
      (s.class && s.class.className) ? s.class.className : (s.className || ''),
      dob,
      s.phone || '',
      s.parentPhone || '',
      s.address || '',
      (s.user && s.user.status) ? s.user.status : (s.status || 'active')
    ]);
  });

  var numRows = rows.length;
  var numCols = headers.length;
  var range = sheet.getRange(1, 1, numRows, numCols);
  range.setValues(rows);

  // Styling header
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#1E40AF');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  
  sheet.autoResizeColumns(1, numCols);
}
`;
