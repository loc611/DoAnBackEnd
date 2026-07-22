import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Nam', 'Nữ', 'Khác'],
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    className: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    status: {
        type: String,
        enum: ['Đang học', 'Bảo lưu', 'Đã tốt nghiệp', 'Đuổi học'],
        default: 'Đang học'
    },
    avatar: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    },
    notes: {
        type: String
    }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);
export default Student;
