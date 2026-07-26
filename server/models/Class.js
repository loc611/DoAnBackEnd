import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
    classCode: {
        type: String,
        required: true,
        unique: true
    },
    className: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    schoolYear: {
        type: String,
        required: true
    },
    homeroomTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    studentCount: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

const Class = mongoose.model('Class', classSchema);
export default Class;
