import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    studentCode: {
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
        default: 'Nam'
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        default: null
    },
    phone: {
        type: String,
    },
    parentPhone: {
        type: String,
    }
}, {
    timestamps: true
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
