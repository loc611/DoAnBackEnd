import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Nam', 'Nữ', 'Khác'],
        default: 'Nam'
    },
    dob: {
        type: String, // format: DD/MM/YYYY
    },
    className: {
        type: String,
    },
    phone: {
        type: String,
    },
    status: {
        type: String,
        default: 'Đang học'
    }
}, {
    timestamps: true
});

const Student = mongoose.model('Student', studentSchema);

export default Student;
