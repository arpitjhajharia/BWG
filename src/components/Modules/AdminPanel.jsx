import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

const SettingsCard = ({ title, settingKey, items, actions }) => {
    const [newItem, setNewItem] = useState('');
    const add = () => {
        if (newItem && !items.includes(newItem)) {
            actions.updateSetting(settingKey, [...items, newItem]);
            setNewItem('');
        }
    };
    const remove = (item) => {
        if (confirm(`Remove ${item}?`)) actions.updateSetting(settingKey, items.filter(i => i !== item));
    };
    return (
        <div className="bg-white border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
            </div>
            <div className="p-3 space-y-3">
                <div className="flex gap-1.5">
                    <input
                        className="border border-slate-300 rounded text-[13px] p-1.5 flex-1 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Add option..."
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && add()}
                    />
                    <button
                        onClick={add}
                        className="px-3 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-bold"
                    >+</button>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto scroller border border-slate-100 rounded">
                    {items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[12px] p-2 hover:bg-slate-50 transition-colors group">
                            <span className="font-medium text-slate-600">{item}</span>
                            <button onClick={() => remove(item)} className="text-slate-300 hover:text-red-500"><Icons.X className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="p-4 text-center text-[11px] text-slate-400 font-bold uppercase">No items</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AdminPanel = ({ currentUser, data, actions, setModal }) => {
    const [subTab, setSubTab] = useState('users');
    const { userProfiles, settings } = data;

    if (currentUser.role !== 'Admin') return (
        <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <Icons.Error className="w-12 h-12 mb-4" />
            <h2 className="text-lg font-bold uppercase tracking-widest">Access Denied</h2>
            <p className="text-sm">Administrative privileges required for this module.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
                    <button
                        onClick={() => setSubTab('users')}
                        className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all ${subTab === 'users' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        User Registry
                    </button>
                    <button
                        onClick={() => setSubTab('settings')}
                        className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all ${subTab === 'settings' ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Master Configuration
                    </button>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 border border-slate-200 rounded">Admin Mode</div>
            </div>

            {subTab === 'users' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-1">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">User Management</h2>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Configure access for internal team members</p>
                        </div>
                        <Button variant="primary" icon={Icons.Plus} onClick={() => setModal({ open: true, type: 'user' })} className="px-6 py-2 shadow-sm uppercase text-[11px] tracking-widest">Add New User</Button>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Identity</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Authorization</th>
                                    <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Utility</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {userProfiles.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px] border border-slate-200 uppercase">
                                                    {(u.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <span className="font-semibold text-slate-700 text-[13px]">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500">{u.username}</code>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge color={u.role === 'Admin' ? 'purple' : 'blue'} className="text-[9px] uppercase tracking-widest py-0.5 px-2 font-bold line-height-none">
                                                {u.role}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setModal({ open: true, type: 'user', data: u, isEdit: true })}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                >
                                                    <Icons.Edit className="w-4 h-4" />
                                                </button>
                                                {u.username !== 'admin' && (
                                                    <button
                                                        onClick={() => { if (confirm('Permanently delete user?')) actions.del('users', u.id) }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                    >
                                                        <Icons.X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="px-1">
                        <h2 className="text-lg font-bold text-slate-800">Master Data Configuration</h2>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Manage centralized dropdown options and system classifications</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SettingsCard title="Product Formats" settingKey="formats" items={settings.formats} actions={actions} />
                        <SettingsCard title="SKU Units" settingKey="units" items={settings.units} actions={actions} />
                        <SettingsCard title="Pack Types" settingKey="packTypes" items={settings.packTypes} actions={actions} />
                        <SettingsCard title="Lead Sources" settingKey="leadSources" items={settings.leadSources} actions={actions} />
                        <SettingsCard title="Lead Statuses" settingKey="leadStatuses" items={settings.leadStatuses} actions={actions} />
                        <SettingsCard title="Task Groups" settingKey="taskGroups" items={settings.taskGroups} actions={actions} />
                        <SettingsCard title="Vendor Status" settingKey="vendorStatuses" items={settings.vendorStatuses} actions={actions} />
                    </div>
                </div>
            )}
        </div>
    );
};