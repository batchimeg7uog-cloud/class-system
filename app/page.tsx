import React, { useState } from 'react';
import { ClipboardList, CalendarDays, Newspaper, BookOpen, MessageSquare, LogIn, LogOut, Plus, Trash2, Edit3, X, CheckSquare } from 'lucide-react';

// Ангийн сурагчдын нэрс (25 сурагч)
const STUDENTS = [
  "Ананд", "Баатар", "Болор", "Гантулга", "Дашням",
  "Жавхлан", "Заяа", "Идэр", "Лхагва", "Мөнх-Эрдэнэ",
  "Намуун", "Оргил", "Пүрэв", "Сарнай", "Тэмүүлэн",
  "Уянга", "Хулан", "Цэнгэл", "Чингүүн", "Шинэбаяр",
  "Эгшиглэн", "Янжинлхам", "Амарсанаа", "Бат-Эрдэнэ", "Гэрэлт-Од"
];

// Анхны өгөгдлүүд
const INITIAL_TASKS = [
  { id: 1, title: 'Намрын мод тарих өдөрлөг', description: 'Сургуулийн гадаах талбайд ангиараа мод тарина. Бээлий авчрах.', dueDate: '2026-09-15' },
  { id: 2, title: 'Математикийн олимпиад', description: 'Сургуулийн аварга шалгаруулах олимпиад болно. Оролцох сурагчид бүртгүүлнэ үү.', dueDate: '2026-10-05' },
  { id: 3, title: 'Ангийн эцэг эхийн хурал', description: 'I улирлын дүнгийн тайлан болон цаашдын зорилтын талаар ярилцана.', dueDate: '2026-11-20' },
];

const INITIAL_ROSTER = [
  { id: 1, date: '2026-08-10', students: ['Ананд', 'Баатар', 'Болор'] },
  { id: 2, date: '2026-08-11', students: ['Гантулга', 'Дашням', 'Жавхлан'] },
  { id: 3, date: '2026-08-12', students: ['Заяа', 'Идэр', 'Лхагва'] },
];

const INITIAL_NEWS = [
  { id: 1, title: 'Шинэ хичээлийн жилийн мэнд!', content: '2026-2027 оны хичээлийн шинэ жил эхэллээ. Бүх сурагчдадаа сурлагын өндөр амжилт хүсье.', date: '2026-09-01' },
  { id: 2, title: 'Сурах бичиг тараах тухай', content: 'Номын сангаас сурах бичгийг ирэх долоо хоногийн Лхагва гаригт тараана.', date: '2026-09-05' },
  { id: 3, title: 'Урлагийн үзлэг', content: 'Сургуулийн урлагийн үзлэг 11-р сард болно. Ангийн дуугаа бэлдэж эхлээрэй.', date: '2026-09-10' },
];

const INITIAL_RULES = [
  { id: 1, text: 'Хичээлд хоцрохгүй, цагтаа ирнэ.' },
  { id: 2, text: 'Бусдыгаа хүндэтгэж, эелдэг харилцана.' },
  { id: 3, text: 'Анги танхимаа цэвэр цэмцгэр байлгана.' },
];

const INITIAL_FEEDBACK = [
  { id: 1, text: 'Ангийн санд нэмэлт цэцэг авъя.', date: '2026-09-02' },
];

export default function App() {
  const [currentView, setCurrentView] = useState('tasks');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Data states
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [roster, setRoster] = useState(INITIAL_ROSTER);
  const [news, setNews] = useState(INITIAL_NEWS);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);

  // Modal states for CRUD operations
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'task', 'roster', 'news', 'rule'

  const navigation = [
    { id: 'tasks', name: 'Ангийн ажлууд', icon: ClipboardList, color: 'text-blue-500', activeBg: 'bg-blue-600', hoverBg: 'hover:bg-blue-900/50' },
    { id: 'roster', name: 'Жижүүрийн хуваарь', icon: CalendarDays, color: 'text-green-500', activeBg: 'bg-green-600', hoverBg: 'hover:bg-green-900/50' },
    { id: 'news', name: 'Мэдээ мэдээлэл', icon: Newspaper, color: 'text-purple-500', activeBg: 'bg-purple-600', hoverBg: 'hover:bg-purple-900/50' },
    { id: 'rules', name: 'Ангийн дүрэм', icon: BookOpen, color: 'text-orange-500', activeBg: 'bg-orange-600', hoverBg: 'hover:bg-orange-900/50' },
    { id: 'feedback', name: 'Санал хүсэлт', icon: MessageSquare, color: 'text-pink-500', activeBg: 'bg-pink-600', hoverBg: 'hover:bg-pink-900/50' },
  ];

  // Helper functions for IDs
  const getNextId = (items) => (items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1);
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // --- Handlers for Deleting ---
  const handleDelete = (id, type) => {
    if (!window.confirm('Үнэхээр устгах уу?')) return;
    switch (type) {
      case 'tasks': setTasks(tasks.filter((t) => t.id !== id)); break;
      case 'roster': setRoster(roster.filter((r) => r.id !== id)); break;
      case 'news': setNews(news.filter((n) => n.id !== id)); break;
      case 'rules': setRules(rules.filter((r) => r.id !== id)); break;
      case 'feedback': setFeedback(feedback.filter((f) => f.id !== id)); break;
    }
  };

  // --- Handlers for Opening Modals ---
  const openModal = (type, item = null) => {
    setModalType(type);
    if (item) {
      setEditingItem({ ...item });
    } else {
      // Default empty items based on type
      if (type === 'task') setEditingItem({ title: '', description: '', dueDate: getTodayStr() });
      else if (type === 'roster') setEditingItem({ date: getTodayStr(), students: [] });
      else if (type === 'news') setEditingItem({ title: '', content: '', date: getTodayStr() });
      else if (type === 'rule') setEditingItem({ text: '' });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
  };

  // --- Handlers for Saving Data ---
  const handleSaveTask = (e) => {
    e.preventDefault();
    if (editingItem.id) {
      setTasks(tasks.map(t => t.id === editingItem.id ? editingItem : t));
    } else {
      setTasks([{ ...editingItem, id: getNextId(tasks) }, ...tasks]);
    }
    closeModal();
  };

  const handleSaveRoster = (e) => {
    e.preventDefault();
    if (editingItem.students.length === 0) {
      alert("Ядаж нэг сурагч сонгоно уу!");
      return;
    }
    if (editingItem.id) {
      setRoster(roster.map(r => r.id === editingItem.id ? editingItem : r));
    } else {
      setRoster([{ ...editingItem, id: getNextId(roster) }, ...roster].sort((a,b) => new Date(a.date) - new Date(b.date)));
    }
    closeModal();
  };

  const handleSaveNews = (e) => {
    e.preventDefault();
    if (editingItem.id) {
      setNews(news.map(n => n.id === editingItem.id ? editingItem : n));
    } else {
      setNews([{ ...editingItem, id: getNextId(news) }, ...news]);
    }
    closeModal();
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    if (editingItem.id) {
      setRules(rules.map(r => r.id === editingItem.id ? editingItem : r));
    } else {
      setRules([...rules, { ...editingItem, id: getNextId(rules) }]);
    }
    closeModal();
  };

  // --- Student Feedback Handler ---
  const [newFeedback, setNewFeedback] = useState('');
  const handleAddFeedback = (e) => {
    e.preventDefault();
    if (!newFeedback.trim()) return;
    setFeedback([{ id: getNextId(feedback), text: newFeedback, date: getTodayStr() }, ...feedback]);
    setNewFeedback('');
  };


  const renderTasks = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Ангийн ажлууд</h2>
        {isAdmin && (
          <button onClick={() => openModal('task')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Шинэ ажил
          </button>
        )}
      </div>
      {tasks.map(task => (
        <div key={task.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-slate-800">{task.title}</h3>
            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
              Хугацаа: {task.dueDate}
            </span>
          </div>
          <p className="text-slate-600 mb-2">{task.description}</p>
          
          {/* Admin Controls */}
          {isAdmin && (
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-white/90 p-1 rounded-lg shadow-sm">
              <button onClick={() => openModal('task', task)} className="p-2 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(task.id, 'tasks')} className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      ))}
      {tasks.length === 0 && <p className="text-slate-500 italic">Одоогоор төлөвлөсөн ажил алга байна.</p>}
    </div>
  );

  const renderRoster = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Жижүүрийн хуваарь</h2>
        {isAdmin && (
          <button onClick={() => openModal('roster')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Хуваарь нэмэх
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase text-xs tracking-wider">
              <th className="p-4 font-semibold w-1/4">Огноо</th>
              <th className="p-4 font-semibold w-2/4">Жижүүр сурагчид</th>
              {isAdmin && <th className="p-4 font-semibold text-right w-1/4">Үйлдэл</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roster.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="p-4 text-slate-600">
                  <div className="flex flex-wrap gap-2">
                    {r.students.map((student, index) => (
                      <span key={index} className="bg-green-50 text-green-700 px-2 py-1 rounded text-sm border border-green-100">
                        {student}
                      </span>
                    ))}
                  </div>
                </td>
                {isAdmin && (
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal('roster', r)} className="p-2 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r.id, 'roster')} className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {roster.length === 0 && <div className="p-4 text-slate-500 italic">Хуваарь оруулаагүй байна.</div>}
      </div>
    </div>
  );

  const renderNews = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Мэдээ мэдээлэл</h2>
        {isAdmin && (
           <button onClick={() => openModal('news')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Мэдээ оруулах
          </button>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {news.map(n => (
          <div key={n.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <CalendarDays className="w-4 h-4" />
              <span>{n.date}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">{n.title}</h3>
            <p className="text-slate-600 leading-relaxed">{n.content}</p>
            
            {isAdmin && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-white/90 p-1 rounded-lg shadow-sm">
                <button onClick={() => openModal('news', n)} className="p-2 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(n.id, 'news')} className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      {news.length === 0 && <p className="text-slate-500 italic">Шинэ мэдээ алга байна.</p>}
    </div>
  );

  const renderRules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-bold text-slate-800">Ангийн дүрэм</h2>
         {isAdmin && (
           <button onClick={() => openModal('rule')} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Дүрэм нэмэх
          </button>
        )}
      </div>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100">
        <ul className="space-y-4">
          {rules.map((rule, index) => (
            <li key={rule.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 group relative">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <p className="text-slate-700 text-lg mt-1">{rule.text}</p>
              
              {isAdmin && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-white/90 p-1 rounded-lg shadow-sm">
                  <button onClick={() => openModal('rule', rule)} className="p-2 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(rule.id, 'rules')} className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {rules.length === 0 && <p className="text-slate-500 italic">Дүрэм оруулаагүй байна.</p>}
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-bold text-slate-800">Санал хүсэлт</h2>
      </div>

      {/* Сурагч санал үлдээх хэсэг */}
      {!isAdmin && (
        <form onSubmit={handleAddFeedback} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-4 text-slate-700">Санал хүсэлтээ үлдээх (Нэргүй)</h3>
          <textarea
            required
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            placeholder="Энд саналаа бичнэ үү..."
            className="w-full border border-slate-200 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none h-24"
          />
          <button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Илгээх
          </button>
        </form>
      )}

      {/* Саналуудын жагсаалт */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-700">Ирүүлсэн саналууд</h3>
        {feedback.map(f => (
          <div key={f.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative group">
            <div className="text-sm text-slate-400 mb-2">{f.date}</div>
            <p className="text-slate-700">{f.text}</p>
            {isAdmin && (
              <button 
                onClick={() => handleDelete(f.id, 'feedback')} 
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Устгах"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {feedback.length === 0 && <p className="text-slate-500 italic">Одоогоор санал ирээгүй байна.</p>}
      </div>
    </div>
  );

  const renderModals = () => {
    if (!modalType || !editingItem) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800">
              {editingItem.id ? 'Мэдээлэл засах' : 'Шинээр нэмэх'}
            </h3>
            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            {modalType === 'task' && (
              <form id="task-form" onSubmit={handleSaveTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг</label>
                  <input required type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дэлгэрэнгүй</label>
                  <textarea required value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Хугацаа</label>
                  <input required type="date" value={editingItem.dueDate} onChange={e => setEditingItem({...editingItem, dueDate: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </form>
            )}

            {modalType === 'roster' && (
              <form id="roster-form" onSubmit={handleSaveRoster} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Огноо</label>
                  <input required type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Сурагчид (25 сурагчаас сонгох)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                    {STUDENTS.map(student => {
                      const isSelected = editingItem.students.includes(student);
                      return (
                        <label key={student} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-green-100 border-green-200' : 'hover:bg-slate-200 border-transparent'} border`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingItem({...editingItem, students: [...editingItem.students, student]});
                              } else {
                                setEditingItem({...editingItem, students: editingItem.students.filter(s => s !== student)});
                              }
                            }}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'}`}>
                            {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-slate-700 select-none">{student}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Сонгосон: {editingItem.students.length}</p>
                </div>
              </form>
            )}

            {modalType === 'news' && (
              <form id="news-form" onSubmit={handleSaveNews} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Гарчиг</label>
                  <input required type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Мэдээ</label>
                  <textarea required value={editingItem.content} onChange={e => setEditingItem({...editingItem, content: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none h-32 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Огноо</label>
                  <input required type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" />
                </div>
              </form>
            )}

            {modalType === 'rule' && (
              <form id="rule-form" onSubmit={handleSaveRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дүрмийн заалт</label>
                  <textarea required value={editingItem.text} onChange={e => setEditingItem({...editingItem, text: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none h-24 resize-none" />
                </div>
              </form>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
            <button onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Цуцлах</button>
            <button type="submit" form={`${modalType}-form`} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">Хадгалах</button>
          </div>
        </div>
      </div>
    );
  };


  const renderLoginModal = () => {
    if (!showLoginModal) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Багшийн эрхээр нэвтрэх</h3>
            <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const username = e.target.username.value;
              const password = e.target.password.value;
              if (username === 'teacher' && password === 'admin123') {
                setIsAdmin(true);
                setShowLoginModal(false);
              } else {
                alert('Нэвтрэх нэр эсвэл нууц үг буруу байна! (teacher / admin123 гэж үзнэ үү)');
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Нэвтрэх нэр</label>
              <input name="username" type="text" defaultValue="teacher" className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Нууц үг</label>
              <input name="password" type="password" defaultValue="admin123" className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
              Нэвтрэх
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Left Sidebar - FIXED and Always Visible */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 h-screen border-r border-slate-800">
        <div className="h-16 flex items-center px-6 bg-slate-950 flex-shrink-0">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white font-bold mr-3 shadow-sm">
            А
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">Ангийн Систем</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Үндсэн цэс</div>
          {navigation.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? `${item.activeBg} text-white shadow-md` : `${item.hoverBg} text-slate-400 hover:text-white`}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
          {!isAdmin ? (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-2.5 rounded-lg transition-colors border border-indigo-500/20 font-medium"
            >
              <LogIn className="w-4 h-4" /> Багш нэвтрэх
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="px-3 py-2 bg-slate-800 rounded-lg flex items-center justify-between border border-slate-700">
                <span className="text-sm text-slate-300">Хэрэглэгч:</span>
                <span className="text-sm font-bold text-indigo-400">Багш</span>
              </div>
              <button 
                onClick={() => setIsAdmin(false)}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg transition-colors border border-red-500/20 font-medium"
              >
                <LogOut className="w-4 h-4" /> Гарах
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 h-screen overflow-y-auto">
        
        {/* Top Header for Admin Warning */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center px-8 shadow-sm">
           <div className="flex-1"></div>
           {isAdmin && (
             <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full text-sm font-medium border border-indigo-100">
               <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
               Багшийн эрх идэвхтэй байна (Засварлах горим)
             </div>
           )}
        </header>

        {/* Scrollable View Content */}
        <div className="p-8 pb-20">
          <div className="max-w-4xl mx-auto">
            {currentView === 'tasks' && renderTasks()}
            {currentView === 'roster' && renderRoster()}
            {currentView === 'news' && renderNews()}
            {currentView === 'rules' && renderRules()}
            {currentView === 'feedback' && renderFeedback()}
          </div>
        </div>

      </main>
      
      {/* Modals Overlay */}
      {renderLoginModal()}
      {renderModals()}
    </div>
  );
}