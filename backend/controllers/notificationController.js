import prisma from '../prismaClient.js';

export const getNotifications = async (req, res) => {
    try {
        const { classId } = req.query;
        
        let whereClause = { targetClassId: null };

        if (classId) {
            whereClause = {
                OR: [
                    { targetClassId: null },
                    { targetClassId: classId }
                ]
            };
        }

        const notifications = await prisma.notification.findMany({
            where: whereClause,
            include: {
                createdBy: { select: { id: true, username: true, role: true } },
                targetClass: { select: { className: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách thông báo' });
    }
};

export const createNotification = async (req, res) => {
    try {
        const { title, content, type, targetClass } = req.body;
        
        const createdNotification = await prisma.notification.create({
            data: {
                title,
                content,
                type: type || 'Thông báo chung',
                targetClassId: targetClass || null,
                createdById: req.user.id
            }
        });

        res.status(201).json(createdNotification);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi tạo thông báo' });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
        if (!notification) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }

        if (req.user.role !== 'admin' && notification.createdById !== req.user.id) {
            return res.status(403).json({ message: 'Không có quyền xóa thông báo này' });
        }

        await prisma.notification.delete({ where: { id: req.params.id } });
        res.json({ message: 'Đã xóa thông báo' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi xóa thông báo' });
    }
};
