import React, { useState, useMemo } from 'react';
import { Icons } from '../ui/Icons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FilterHeader } from '../shared/FilterHeader';
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
                <div className="flex flex-col gap-2 items-center mt-1 shrink-0">
                    <button
                        onClick={() => crud.update('tasks', task.id, { priority: task.priority === 'High' ? 'Normal' : 'High' })}
                        className={`transition-all ${task.priority === 'High' ? 'text-red-500 scale-110 shadow-sm' : 'text-slate-200 hover:text-slate-400'}`}
                        title={task.priority === 'High' ? 'High Priority' : 'Normal Priority'}
                    >
                        <Icons.AlertCircle className="w-4 h-4" />
                    </button>
                    <input
                        type="checkbox"
                        checked={task.status === 'Completed'}
                        onChange={(e) => crud.update('tasks', task.id, { status: e.target.checked ? 'Completed' : 'Pending' })}
                        className="cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </div>
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
    const [sort, setSort] = useState({ key: 'dueDate', dir: 'asc' });
    const [colFilters, setColFilters] = useState({
        title: '',
        status: [],
        assignee: [],
        priority: [],
        relatedName: '',
        dueDate: ''
    });
    const [localSearch, setLocalSearch] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarAssignee, setCalendarAssignee] = useState('');
    const [dragTaskId, setDragTaskId] = useState(null);
    const [hideCompleted, setHideCompleted] = useState(true);

    const handleSort = (key) => {
        setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const assigneeOptions = useMemo(() => [...new Set(tasks.map(t => t.assignee).filter(Boolean))].sort(), [tasks]);
    const priorityOptions = ['High', 'Normal'];
    const statusOptions = ['Pending', 'Completed'];

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (hideCompleted && t.status === 'Completed') return false;
            if (localSearch && !String(t.title).toLowerCase().includes(localSearch.toLowerCase())) return false;
            if (colFilters.title && !String(t.title).toLowerCase().includes(colFilters.title.toLowerCase())) return false;
            if (colFilters.status.length > 0 && !colFilters.status.includes(t.status || 'Pending')) return false;
            if (colFilters.assignee.length > 0 && !colFilters.assignee.includes(t.assignee)) return false;
            if (colFilters.priority.length > 0 && !colFilters.priority.includes(t.priority || 'Normal')) return false;
            if (colFilters.relatedName && !(t.relatedName || '').toLowerCase().includes(colFilters.relatedName.toLowerCase())) return false;
            if (colFilters.dueDate && !(t.dueDate || '').includes(colFilters.dueDate)) return false;
            return true;
        }).sort((a, b) => {
            const valA = (a[sort.key] || '');
            const valB = (b[sort.key] || '');
            if (typeof valA === 'string') return sort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return sort.dir === 'asc' ? valA - valB : valB - valA;
        });
    }, [tasks, localSearch, colFilters, sort, hideCompleted]);

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
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
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
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                className="appearance-none bg-white border border-slate-200 rounded-md pl-7 pr-6 py-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-400 transition-all hover:border-slate-300"
                                value={calendarAssignee}
                                onChange={e => setCalendarAssignee(e.target.value)}
                            >
                                <option value="">All Assignees</option>
                                {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <Icons.Users className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <Icons.ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={prevPeriod} className="p-1 hover:bg-slate-100 rounded"><Icons.ChevronLeft className="w-5 h-5 text-slate-500" /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-blue-600 px-2 hover:underline">Today</button>
                            <button onClick={nextPeriod} className="p-1 hover:bg-slate-100 rounded"><Icons.ChevronRight className="w-5 h-5 text-slate-500" /></button>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
                    {weekDays.map(d => <div key={d} className="p-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>)}
                </div>
                <div className="flex-1 overflow-auto scroller">
                    <div className="grid grid-cols-7" style={{ gridAutoRows: isWeek ? undefined : 'minmax(100px, auto)' }}>
                        {days.map((day, i) => {
                            if (!day) return <div key={i} className="bg-slate-50 border-r border-b border-slate-100"></div>;

                            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                            const dayTasks = tasks.filter(t => t.dueDate === dateStr && (!calendarAssignee || t.assignee === calendarAssignee) && (!hideCompleted || t.status !== 'Completed'));
                            const isToday = new Date().toDateString() === day.toDateString();

                            return (
                                <div
                                    key={i}
                                    className={`border-r border-b border-slate-100 p-2 min-h-[100px] relative hover:bg-slate-50 transition-colors group ${isWeek ? 'min-h-[400px]' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-blue-400', 'ring-inset', 'bg-blue-50/50'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'ring-inset', 'bg-blue-50/50'); }}
                                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'ring-inset', 'bg-blue-50/50'); if (dragTaskId) { actions.update('tasks', dragTaskId, { dueDate: dateStr }); setDragTaskId(null); } }}
                                >
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
                                                    draggable
                                                    onDragStart={(e) => { setDragTaskId(t.id); e.dataTransfer.effectAllowed = 'move'; }}
                                                    onDragEnd={() => setDragTaskId(null)}
                                                    onClick={() => setModal({ open: true, type: 'task', data: t, isEdit: true })}
                                                    className={`text-[10px] px-1.5 py-1 rounded cursor-grab active:cursor-grabbing border mb-1 whitespace-normal break-words group/task ${colorClass} ${t.status === 'Completed' ? 'opacity-50 line-through' : ''} ${dragTaskId === t.id ? 'opacity-40 scale-95' : ''} transition-all`}
                                                >
                                                    <div className="flex items-start gap-1">
                                                        {t.priority === 'High' && <Icons.AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />}
                                                        <input
                                                            type="checkbox"
                                                            checked={t.status === 'Completed'}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => actions.update('tasks', t.id, { status: e.target.checked ? 'Completed' : 'Pending' })}
                                                            className="mt-0.5 w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer bg-white"
                                                        />
                                                        <div className="flex-1 font-bold leading-tight mb-0.5">{t.title}</div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); if (confirm('Delete this task?')) actions.del('tasks', t.id); }}
                                                            className="opacity-0 group-hover/task:opacity-100 p-0.5 hover:text-red-400 transition-all shrink-0"
                                                        ><Icons.Trash className="w-2.5 h-2.5" /></button>
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
            </div>
        );
    };

    const renderTableView = () => (
        <Card className="overflow-hidden h-full flex flex-col">
            <div className="overflow-auto scroller flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="divide-x divide-slate-100 border-b border-slate-200">
                            <th className="sticky top-0 z-10 bg-slate-50 px-2 py-1.5 w-10">
                                <FilterHeader label="" sortKey="priority" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={colFilters.priority} onFilter={v => setColFilters(p => ({ ...p, priority: v }))} options={priorityOptions} />
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 px-2 py-1.5 w-8 text-center text-[10px] font-bold text-slate-400">Done</th>
                            <th className="sticky top-0 z-10 bg-slate-50/50 p-0 min-w-[180px]">
                                <FilterHeader label="Task" sortKey="title" currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.title} onFilter={v => setColFilters(p => ({ ...p, title: v }))} />
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50/50 p-0 w-28">
                                <FilterHeader label="Due Date" sortKey="dueDate" currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.dueDate} onFilter={v => setColFilters(p => ({ ...p, dueDate: v }))} />
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50/50 p-0 w-32">
                                <FilterHeader label="Assignee" sortKey="assignee" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={colFilters.assignee} onFilter={v => setColFilters(p => ({ ...p, assignee: v }))} options={assigneeOptions} />
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50/50 p-0 w-44">
                                <FilterHeader label="Related To" sortKey="relatedName" currentSort={sort} onSort={handleSort} filterType="text" filterValue={colFilters.relatedName} onFilter={v => setColFilters(p => ({ ...p, relatedName: v }))} />
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50/50 p-0 w-24">
                                <FilterHeader label="Status" sortKey="status" currentSort={sort} onSort={handleSort} filterType="multi-select" filterValue={colFilters.status} onFilter={v => setColFilters(p => ({ ...p, status: v }))} options={statusOptions} />
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTasks.map(t => (
                            <tr key={t.id} className={`hover:bg-slate-50/80 group transition-colors divide-x divide-slate-50 ${t.priority === 'High' ? 'bg-red-50/30' : ''}`}>
                                <td className="px-2 py-1.5 text-center">
                                    <button
                                        onClick={() => actions.update('tasks', t.id, { priority: t.priority === 'High' ? 'Normal' : 'High' })}
                                        className={`transition-all ${t.priority === 'High' ? 'text-red-500 scale-110' : 'text-slate-200 hover:text-slate-400'}`}
                                        title={t.priority === 'High' ? 'High Priority' : 'Click to mark High'}
                                    >
                                        <Icons.AlertCircle className="w-4 h-4" />
                                    </button>
                                </td>
                                <td className="px-2 py-1.5 text-center">
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
                                    {t.assignee ? <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-px rounded-full border border-slate-200">{t.assignee}</span> : <span className="text-slate-200 text-[10px]">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-[11px] text-slate-500">
                                    {t.relatedName ? (
                                        <div className="flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${t.contextType === 'Vendor' ? 'bg-purple-400' : 'bg-green-400'}`}></span>
                                            {t.relatedName}
                                        </div>
                                    ) : t.taskGroup ? (
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            {t.taskGroup}
                                        </div>
                                    ) : <span className="text-slate-200 text-[10px]">—</span>}
                                </td>
                                <td className="px-3 py-1.5">
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-px rounded ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status || 'Pending'}</span>
                                </td>
                                <td className="px-1 py-1.5 text-right">
                                    <div className="flex items-center justify-end gap-0.5">
                                        <button onClick={() => setModal({ open: true, type: 'task', data: t, isEdit: true })} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Icons.Edit className="w-3 h-3" /></button>
                                        <button onClick={() => { if (confirm('Delete this task?')) actions.del('tasks', t.id); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Icons.Trash className="w-3 h-3" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredTasks.length === 0 && (
                            <tr>
                                <td colSpan="8" className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-300">
                                        <Icons.Search className="w-12 h-12 mb-2 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-[0.2em]">No Matching Tasks</p>
                                    </div>
                                </td>
                            </tr>
                        )}
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
                    <button
                        onClick={() => setHideCompleted(h => !h)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-all ${hideCompleted ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                        <Icons.Check className="w-3.5 h-3.5" />
                        {hideCompleted ? 'Open Only' : 'All Tasks'}
                    </button>
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