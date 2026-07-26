import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    teacherCode: {
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
    phone: {
        type: String,
    },
    subject: {
        type: String,
    },
    department: {
        type: String,
    }
}, {
    timestamps: true
});

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;
