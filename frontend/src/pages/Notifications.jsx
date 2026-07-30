import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Send } from 'lucide-react';
import api from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  
  // New notification state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('Thông báo chung');
  const [newTargetClass, setNewTargetClass] = useState('');

  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    fetchNotifications();
    if (userRole !== 'student') {
      fetchClasses();
    }
  }, [userRole]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      let url = '/notifications';
      if (userRole === 'student' && userData.classId) {
        url += `?classId=${userData.classId}`;
      }
      const res = await api.get(url);
      setNotifications(res.data);
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lớp:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle || !newContent) return alert('Vui lòng nhập đủ tiêu đề và nội dung');
    
    try {
      await api.post('/notifications', {
        title: newTitle,
        content: newContent,
        type: newType,
        targetClass: newTargetClass || null
      });
      setIsComposing(false);
      setNewTitle('');
      setNewContent('');
      setNewTargetClass('');
      fetchNotifications();
    } catch (error) {
      console.error('Lỗi tạo thông báo:', error);
      alert('Tạo thông báo thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Lỗi xóa thông báo:', error);
      alert('Không có quyền xóa hoặc lỗi server');
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { 
      hour: '2-digit', minute: '2-digit', 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Bell className="mr-2 text-blue-600" /> Bảng tin & Thông báo
        </h2>
        {userRole !== 'student' && (
          <button 
            onClick={() => setIsComposing(!isComposing)}
            className="btn-primary flex items-center"
          >
            <Plus size={20} className="mr-2" />
            {isComposing ? 'Hủy' : 'Viết thông báo'}
          </button>
        )}
      </div>

      {isComposing && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Nhập tiêu đề..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                  >
                    <option>Thông báo chung</option>
                    <option>Hệ thống</option>
                    <option>Cảnh báo</option>
                    <option>Nhắc nhở</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gửi tới</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                    value={newTargetClass}
                    onChange={e => setNewTargetClass(e.target.value)}
                  >
                    <option value="">Toàn trường</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Lớp {c.className}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
              <textarea 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows="3"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Nhập nội dung thông báo..."
                required
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors">
                <Send size={18} className="mr-2" /> Gửi thông báo
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Đang tải thông báo...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
             <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell size={24} className="text-gray-400" />
             </div>
             <p className="text-gray-500">Chưa có thông báo nào</p>
          </div>
        ) : (
          notifications.map(noti => (
            <div key={noti.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
               {(userRole === 'admin' || (userRole === 'teacher' && noti.createdBy?.id === userData.id)) && (
                  <button 
                    onClick={() => handleDelete(noti.id)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
               )}
               <div className="flex items-center gap-3 mb-3">
                 <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    noti.type === 'Cảnh báo' ? 'bg-red-100 text-red-700' :
                    noti.type === 'Nhắc nhở' ? 'bg-amber-100 text-amber-700' :
                    noti.type === 'Hệ thống' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                 }`}>
                   {noti.type}
                 </span>
                 <span className="text-sm text-gray-500">
                    {formatDate(noti.createdAt)}
                 </span>
                 {noti.targetClass && (
                    <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Tới: {noti.targetClass.className}
                    </span>
                 )}
               </div>
               <h3 className="text-lg font-bold text-gray-800 mb-2 pr-10">{noti.title}</h3>
               <p className="text-gray-600 whitespace-pre-wrap">{noti.content}</p>
               <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500 flex items-center">
                 <span>Đăng bởi: <strong>{noti.createdBy?.username || 'Hệ thống'}</strong></span>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
