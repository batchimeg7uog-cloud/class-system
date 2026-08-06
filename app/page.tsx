"use client";

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  CalendarDays, 
  Newspaper, 
  BookOpen, 
  MessageSquare, 
  LogIn, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  CheckSquare 
} from 'lucide-react';

// --- Static Data ---
const STUDENTS = [
  "Ананд", "Баатар", "Болор", "Гантулга", "Дашням",
  "Жавхлан", "Заяа", "Идэр", "Лхагва", "Мөнх-Эрдэнэ",
  "Намуун", "Оргил", "Пүрэв", "Сарнай", "Тэмүүлэн",
  "Уянга", "Хулан", "Цэнгэл", "Чингүүн", "Шинэбаяр",
  "Эгшиглэн", "Янжинлхам", "Амарсанаа", "Бат-Эрдэнэ", "Гэрэлт-Од"
];

const INITIAL_TASKS = [
  { id: 1, title: 'Намрын мод тарих өдөрлөг', description: 'Сургуулийн гадаах талбайд ангиараа мод тарина. Бээлий авчрах.', dueDate: '2026-09-15' },
  { id: 2, title: 'Математикийн олимпиад', description: 'Сургуулийн аварга шалгаруулах олимпиад болно.', dueDate: '2026-10-05' },
];

const INITIAL_ROSTER = [
  { id: 1, date: '2026-09-01', students: ['Ананд', 'Баатар', 'Болор'] },
];

const INITIAL_NEWS = [
  { id: 1, title: 'Шинэ хичээлийн жил', content: '2026 оны хичээлийн шинэ жил эхэллээ.', date: '2026-09-01' },
];

const INITIAL_RULES = [
  { id: 1, text: 'Хичээлд хоцрохгүй ирэх.' },
  { id: 2, text: 'Бие биеэ хүндэтгэх.' },
];

export default function ClassSystem() {
  const [currentView, setCurrentView] = useState('tasks');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Data States
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [roster, setRoster] = useState(INITIAL_ROSTER);
  const [news, setNews] = useState(INITIAL_NEWS);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [feedback, setFeedback] = useState<{id: number, text: string, date: string}[]>([]);
  const [newFeedback, setNewFeedback] = useState('');

  // Modal State
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const navigation = [
    { id: 'tasks', name: 'Ангийн ажлууд', icon: ClipboardList, color: 'text-blue-500' },
    { id: 'roster', name: 'Жижүүрийн хуваарь', icon: CalendarDays, color: 'text-green-500' },
    { id: 'news', name: 'Мэдээлэл', icon: Newspaper, color: 'text-purple-500' },
    { id: 'rules', name: 'Дүрэм', icon: BookOpen, color: 'text-orange-500' },
    { id: 'feedback', name: 'Санал хүсэлт', icon: MessageSquare, color: 'text-pink-500' },
  ];

  const handleDelete = (id: number, type: string) => {
    if (!confirm('Устгахдаа итгэлтэй байна уу?')) return;
    if (type === 'tasks') setTasks(tasks.filter(t => t.id !== id));
    if (type === 'roster') setRoster(roster.filter(r => r.id !== id));
    if (type === 'news') setNews(news.filter(n => n.id !== id));
    if (type === 'rules') setRules(rules.filter(r => r.id !== id));
    if (type === 'feedback') setFeedback(feedback.filter(f => f.id !== id));
  };

  const openModal = (type: string, item: any = null) => {
    setModalType(type);
    setEditingItem(item || { id: null, title: '', description: '', text: '', content: '', date: new Date().toISOString().split('T')[0], students: [] });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingItem.id || Date.now();
    const newItem = { ...editingItem, id };

    if (modalType === 'task') {
      setTasks(editingItem.id ? tasks.map(t => t.id === id ? newItem : t) : [newItem, ...tasks]);
    } else if (modalType === 'news') {
      setNews(editingItem.id ? news.map(n => n.id === id ? newItem : n) : [newItem, ...news]);
    } else if (modalType === 'rule') {
      setRules(editingItem.id ? rules.map(r => r.id === id ? newItem : r) : [...rules, newItem]);
    } else if (modalType === 'roster') {
      setRoster(editingItem.id ? roster.map(r => r.id === id ? newItem : r) : [newItem, ...roster]);
    }
    setModalType(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 bg-slate-950 font-bold text-white text-lg border-b border-slate-800">
          Ангийн Систем
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-white' : item.color}`} />
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          {!isAdmin ? (
            <button onClick={() => setShowLoginModal(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors">
              Багш нэвтрэх
            </button>
          ) : (
            <button onClick={() => setIsAdmin(false)} className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 py-2.5 rounded-lg font-medium transition-colors">
              Системээс гарах
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex-1">
            {isAdmin && (
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 flex items-center w-fit gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                ЗАСВАРЛАХ ГОРИМ ИДЭВХТЭЙ
              </span>
            )}
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto">
          {currentView === 'tasks' && (
            <section className="animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Төлөвлөсөн ажлууд</h2>
                {isAdmin && <button onClick={() => openModal('task')} className="bg-indigo-600 text-white p-2 rounded-lg"><Plus /></button>}
              </div>
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group relative">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-slate-800">{task.title}</h3>
                      <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{task.dueDate}</span>
                    </div>
                    <p className="mt-2 text-slate-600">{task.description}</p>
                    {isAdmin && (
                      <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal('task', task)} className="text-slate-400 hover:text-indigo-600"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(task.id, 'tasks')} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {currentView === 'roster' && (
            <section className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Жижүүрийн хуваарь</h2>
                {isAdmin && <button onClick={() => openModal('roster')} className="bg-green-600 text-white p-2 rounded-lg"><Plus /></button>}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-semibold text-slate-600">Огноо</th>
                      <th className="p-4 font-semibold text-slate-600">Сурагчид</th>
                      {isAdmin && <th className="p-4 font-semibold text-right text-slate-600">Үйлдэл</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium">{r.date}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {r.students.map((s: string) => <span key={s} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded border border-green-100">{s}</span>)}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <button onClick={() => handleDelete(r.id, 'roster')} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentView === 'feedback' && (
            <section className="space-y-6 animate-in slide-in-from-right-4">
              <h2 className="text-2xl font-bold text-slate-800">Санал хүсэлт</h2>
              {!isAdmin && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <textarea 
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Саналаа энд бичнэ үү..."
                    className="w-full border border-slate-200 rounded-lg p-4 h-32 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                  />
                  <button 
                    onClick={() => {
                      if (newFeedback.trim()) {
                        setFeedback([{ id: Date.now(), text: newFeedback, date: new Date().toLocaleDateString() }, ...feedback]);
                        setNewFeedback('');
                        alert('Илгээлээ!');
                      }
                    }}
                    className="mt-4 bg-pink-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-pink-600/20 hover:bg-pink-700 transition-colors"
                  >
                    Илгээх
                  </button>
                </div>
              )}
              <div className="space-y-4">
                {feedback.map(f => (
                  <div key={f.id} className="bg-white p-4 rounded-xl border border-slate-200 group relative">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">{f.date}</span>
                    <p className="text-slate-700">{f.text}</p>
                    {isAdmin && (
                      <button onClick={() => handleDelete(f.id, 'feedback')} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ...Бусад хэсгүүд адил замаар... */}
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Нэвтрэх</h3>
              <button onClick={() => setShowLoginModal(false)}><X /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              if (e.target.user.value === 'teacher' && e.target.pass.value === 'admin123') {
                setIsAdmin(true);
                setShowLoginModal(false);
              } else {
                alert('Буруу байна!');
              }
            }} className="space-y-4">
              <input name="user" type="text" placeholder="Нэр" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              <input name="pass" type="password" placeholder="Нууц үг" className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Нэвтрэх</button>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Data Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 uppercase tracking-tight">Мэдээлэл шинэчлэх</h3>
              <button onClick={() => setModalType(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalType === 'task' && (
                <>
                  <input required placeholder="Гарчиг" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full border p-2.5 rounded-lg" />
                  <textarea required placeholder="Тайлбар" value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full border p-2.5 rounded-lg h-24" />
                  <input required type="date" value={editingItem.dueDate} onChange={e => setEditingItem({...editingItem, dueDate: e.target.value})} className="w-full border p-2.5 rounded-lg" />
                </>
              )}
              {modalType === 'roster' && (
                <>
                  <input required type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} className="w-full border p-2.5 rounded-lg mb-4" />
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                    {STUDENTS.map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm p-1 hover:bg-white rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingItem.students.includes(s)}
                          onChange={e => {
                            const next = e.target.checked ? [...editingItem.students, s] : editingItem.students.filter((x: string) => x !== s);
                            setEditingItem({...editingItem, students: next});
                          }}
                        /> {s}
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setModalType(null)} className="flex-1 bg-slate-100 py-2.5 rounded-lg font-bold">Цуцлах</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold">Хадгалах</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}