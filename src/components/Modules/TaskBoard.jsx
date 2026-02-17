import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/helpers';

// --- SUB-COMPONENT: INLINE TASK ---
const InlineTask = ({ task, crud, userProfiles }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isDateEditing, setIsDateEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const handleBlur = () => { setIsEditing(false); if (title !== task.title) crud.update('tasks', task.id, { title }); };

    return (
        <div className="group bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-all mb-2">
            <div className="flex gap-3 items-start">
                <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    onChange={(e) => crud.update('tasks', task.id, { status: e.target.checked ? 'Completed' : 'Pending' })}
                    className="mt-1 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="mb-2">
                        {isEditing ? (
                            <input
                                className="w-full text-sm font-medium border-b border-blue-500 focus:outline-none pb-1 bg-transparent"
                                value={title}
                                autoFocus
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                            />
                        ) : (
                            <div
                                onDoubleClick={() => setIsEditing(true)}
                                className={`text-sm font-medium leading-snug break-words ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}
                            >
                                {task.title}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 max-w-[120px]">
                            <div className="w-4 h-4 rounded-full bg-slate-200 text-[8px] flex items-center justify-center text-slate-600 font-bold shrink-0">
                                {task.assignee ? task.assignee.charAt(0) : '?'}
                            </div>
                            <select
                                className="bg-transparent border-none p-0 text-[10px] text-slate-600 focus:ring-0 cursor-pointer w-full truncate font-medium"
                                value={task.assignee || ''}
                                onChange={(e) => crud.update('tasks', task.id, { assignee: e.target.value })}
                            >
                                <option value="">Assignee</option>
                                {userProfiles.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 cursor-pointer" onClick={() => setIsDateEditing(true)}>
                            {isDateEditing ? (
                                <input
                                    type="date"
                                    className="bg-transparent border-none p-0 text-[10px] text-slate-500 focus:ring-0 w-[80px] font-mono"
                                    value={task.dueDate || ''}
                                    autoFocus
                                    onBlur={() => setIsDateEditing(false)}
                                    onChange={(e) => { crud.update('tasks', task.id, { dueDate: e.target.value }); setIsDateEditing(false); }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {formatDate(task.dueDate)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { InlineTask }; // Exporting this so other modules can use it

// --- MAIN COMPONENT: TASK BOARD ---
export const TaskBoard = ({ data, actions, setModal }) => {
    const { tasks } = data;
    const [viewMode, setViewMode] = useState('list');
    const [filterPriority] = useState('All');
    const [sort] = useState({ key: 'dueDate', dir: 'asc' });
    const [localSearch, setLocalSearch] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
            if (localSearch && !String(t.title).toLowerCase().includes(localSearch.toLowerCase())) return false;
            return true;
        }).sort((a, b) => {
            const valA = (a[sort.key] || '');
            const valB = (b[sort.key] || '');
            return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }, [tasks, filterPriority, localSearch, sort]);

    // --- CALENDAR HELPERS ---
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        return days;
    };

    const getWeeklyDays = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const week = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            week.push(d);
        }
        return week;
    };

    const nextPeriod = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'calendar-week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };
    const prevPeriod = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'calendar-week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const getAssigneeColor = (name) => {
        if (!name) return 'bg-white border-slate-200 text-slate-700';
        const colors = [
            'bg-blue-600 border-blue-700 text-white',
            'bg-emerald-600 border-emerald-700 text-white',
            'bg-violet-600 border-violet-700 text-white',
            'bg-amber-600 border-amber-700 text-white',
            'bg-rose-600 border-rose-700 text-white',
            'bg-indigo-600 border-indigo-700 text-white',
            'bg-cyan-600 border-cyan-700 text-white',
            'bg-slate-600 border-slate-700 text-white'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    // --- RENDERERS ---
    const renderCalendar = () => {
        const isWeek = viewMode === 'calendar-week';
        const days = isWeek ? getWeeklyDays() : getCalendarDays();
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex flex-col overflow-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-lg text-slate-800">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex bg-slate-100 rounded p-0.5 text-xs">
                            <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 rounded ${viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Month</button>
                            <button onClick={() => setViewMode('calendar-week')} className={`px-3 py-1 rounded ${viewMode === 'calendar-week' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Week</button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={prevPeriod} className="p-1 hover:bg-slate-100 rounded"><Icons.ChevronLeft className="w-5 h-5 text-slate-500" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-blue-600 px-2 hover:underline">Today</button>
                        <button onClick={nextPeriod} className="p-1 hover:bg-slate-100 rounded"><Icons.ChevronRight className="w-5 h-5 text-slate-500" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
                    {weekDays.map(d => <div key={d} className="p-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>)}
                </div>
                <div className="grid grid-cols-7" style={{ gridAutoRows: isWeek ? undefined : 'minmax(100px, auto)' }}>
                    {days.map((day, i) => {
                        if (!day) return <div key={i} className="bg-slate-50 border-r border-b border-slate-100"></div>;

                        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                        const dayTasks = tasks.filter(t => t.dueDate === dateStr);
                        const isToday = new Date().toDateString() === day.toDateString();

                        return (
                            <div key={i} className={`border-r border-b border-slate-100 p-2 min-h-[100px] relative hover:bg-slate-50 transition-colors group ${isWeek ? 'min-h-[400px]' : ''}`}>
                                <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-500'}`}>
                                    {day.getDate()}
                                </div>
                                <div className="space-y-1">
                                    {dayTasks.map(t => {
                                        const colorClass = getAssigneeColor(t.assignee);
                                        const isDark = colorClass.includes('text-white');
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setModal({ open: true, type: 'task', data: t, isEdit: true })}
                                                className={`text-[10px] px-1.5 py-1 rounded cursor-pointer border mb-1 whitespace-normal break-words ${colorClass} ${t.status === 'Completed' ? 'opacity-50 line-through' : ''}`}
                                            >
                                                <div className="flex items-start gap-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={t.status === 'Completed'}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => actions.update('tasks', t.id, { status: e.target.checked ? 'Completed' : 'Pending' })}
                                                        className="mt-0.5 w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer bg-white"
                                                    />
                                                    <div className="font-bold leading-tight mb-0.5">{t.title}</div>
                                                </div>
                                                {t.relatedName && (
                                                    <div className={`text-[9px] ${isDark ? 'text-white/80' : 'text-slate-600'} truncate pl-4`}>
                                                        {t.contextType === 'Vendor' ? '🏭 ' : '👤 '}{t.relatedName}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setModal({ open: true, type: 'task', data: { dueDate: dateStr } })}
                                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 bg-white rounded shadow-sm border border-slate-200"
                                >
                                    <Icons.Plus className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTableView = () => (
        <Card className="overflow-hidden h-full flex flex-col">
            <div className="overflow-auto scroller flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b w-8"></th>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b">Task</th>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b w-24">Due Date</th>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b w-28">Assignee</th>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b w-20">Priority</th>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b w-36">Related To</th>
                            <th className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 border-b w-16">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 group border-b border-slate-100 last:border-0">
                                <td className="px-3 py-1.5">
                                    <input
                                        type="checkbox"
                                        checked={t.status === 'Completed'}
                                        onChange={(e) => actions.update('tasks', t.id, { status: e.target.checked ? 'Completed' : 'Pending' })}
                                        className="rounded text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                                    />
                                </td>
                                <td className={`px-3 py-1.5 font-medium text-[12px] ${t.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                    {t.title}
                                </td>
                                <td className="px-3 py-1.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{formatDate(t.dueDate)}</td>
                                <td className="px-3 py-1.5">
                                    {t.assignee ? <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-px rounded-full border border-slate-200">{t.assignee}</span> : '-'}
                                </td>
                                <td className="px-3 py-1.5">
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-px rounded ${t.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{t.priority}</span>
                                </td>
                                <td className="px-3 py-1.5 text-[11px] text-slate-500">
                                    {t.relatedName ? (
                                        <div className="flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${t.contextType === 'Vendor' ? 'bg-purple-400' : 'bg-green-400'}`}></span>
                                            {t.relatedName}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-3 py-1.5">
                                    <button onClick={() => setModal({ open: true, type: 'task', data: t, isEdit: true })} className="text-slate-400 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    return (
        <div className="space-y-2 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-slate-800">Tasks</h2>
                    <div className="h-6 w-px bg-slate-300 mx-1"></div>
                    <div className="flex bg-slate-100 rounded p-0.5">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Table View"><Icons.List className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded ${viewMode.includes('calendar') ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Calendar View"><Icons.Calendar className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative"><Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><input className="pl-8 pr-3 py-1.5 border rounded text-sm focus:ring-1 ring-blue-200 outline-none w-48" placeholder="Search..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} /></div>
                    <Button icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'task' })}>New Task</Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
                {viewMode === 'list' && renderTableView()}
                {(viewMode === 'calendar' || viewMode === 'calendar-week') && renderCalendar()}
            </div>
        </div>
    );
};