import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Icons } from '../ui/Icons';
import { Card } from '../ui/Card';
import { formatDate, formatMoney } from '../../utils/helpers';

const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-4 border border-slate-200 flex items-center justify-between shadow-sm">
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className="p-2.5 bg-slate-50 text-slate-400 border border-slate-100 rounded">
            <Icon className="w-5 h-5" />
        </div>
    </div>
);

export const DashboardOverview = ({ data, actions, setActiveTab }) => {
    const { products, clients, tasks, quotesSent } = data;

    // Calculate Revenue
    const totalRevenue = quotesSent.reduce((acc, q) => acc + (parseFloat(q.sellingPrice || 0) * (parseFloat(q.moq || 0))), 0);

    // Prepare Chart Data
    const chartData = quotesSent.slice(0, 7).map(q => ({
        name: q.quoteId || 'N/A',
        value: parseFloat(q.sellingPrice || 0) * parseFloat(q.moq || 0)
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h2 className="text-xl font-bold text-slate-800">Executive Dashboard</h2>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 border border-slate-200 rounded">Real-time Overview</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Active Products" value={products.length} icon={Icons.Product} color="blue" />
                <StatCard title="Active Clients" value={clients.filter(c => c.status === 'Active').length} icon={Icons.Users} color="green" />
                <StatCard title="Pending Tasks" value={tasks.filter(t => t.status !== 'Completed').length} icon={Icons.Task} color="red" />
                <StatCard title="Total Pipeline" value={formatMoney(totalRevenue)} icon={Icons.Money} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue Forecast (Recent Quotes)</h3>
                    </div>
                    <div className="p-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#94a3b8', fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `₹${v / 1000}k`}
                                    tick={{ fill: '#94a3b8', fontWeight: 600 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        borderRadius: '4px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#3b82f6"
                                    radius={[2, 2, 0, 0]}
                                    barSize={32}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Urgent Pending Tasks</h3>
                        <button onClick={() => setActiveTab('tasks')} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">View All</button>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[288px] overflow-y-auto scroller">
                        {tasks.filter(t => t.status !== 'Completed').slice(0, 10).map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-slate-50/50 transition-colors">
                                <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${t.priority === 'High' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold text-slate-700 truncate">{t.title}</div>
                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                        {formatDate(t.dueDate)} • <span className="text-slate-500">{t.assignee}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => actions.update('tasks', t.id, { status: 'Completed' })}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50/50 rounded transition-all"
                                >
                                    Action
                                </button>
                            </div>
                        ))}
                        {tasks.filter(t => t.status !== 'Completed').length === 0 && (
                            <div className="p-8 text-center">
                                <Icons.Task className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">All tasks cleared</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};