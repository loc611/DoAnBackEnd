/**
 * Kiểm tra định dạng số điện thoại Việt Nam hợp lệ:
 * Bắt đầu bằng 0, theo sau là 9 chữ số (tổng cộng đúng 10 số).
 * Đầu số thông dụng: 03, 05, 07, 08, 09
 */
export const PHONE_REGEX = /^0(3|5|7|8|9)\d{8}$/;
export const PHONE_10_DIGITS_REGEX = /^0\d{9}$/;

export const PHONE_ERROR_MESSAGES = {
    REQUIRED: 'Vui lòng nhập số điện thoại',
    INVALID: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0 (VD: 0912345678)',
    PARENT_REQUIRED: 'Vui lòng nhập số điện thoại phụ huynh',
    PARENT_INVALID: 'SĐT phụ huynh phải gồm 10 chữ số, bắt đầu bằng 0 (VD: 0912345678)'
};

/**
 * Validate một chuỗi số điện thoại
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    return PHONE_10_DIGITS_REGEX.test(phone.trim());
};

/**
 * Xử lý chuỗi input: chỉ giữ lại chữ số và cắt tối đa 10 chữ số
 * @param {string} value
 * @returns {string}
 */
export const sanitizePhoneNumber = (value) => {
    if (!value) return '';
    return String(value).replace(/\D/g, '').slice(0, 10);
};
