export const generateStudentCode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `HS${randomNum}`;
};

export const generateTeacherCode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `GV${randomNum}`;
};
