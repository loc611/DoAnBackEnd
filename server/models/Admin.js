import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
    },
    avatar: {
        type: String,
    }
}, {
    timestamps: true
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
