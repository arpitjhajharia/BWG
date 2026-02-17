import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../ui/Icons';

export const FilterHeader = ({ label, sortKey, currentSort, onSort, filterType, filterValue, onFilter, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMultiSelect = (option) => {
        const current = Array.isArray(filterValue) ? filterValue : [];
        const updated = current.includes(option) ? current.filter(i => i !== option) : [...current, option];
        onFilter(updated);
    };

    return (
        <div className="flex flex-col gap-0.5 w-full bg-white p-1 border border-slate-100/50">
            <div
                className="flex items-center justify-between cursor-pointer group/label select-none px-0.5"
                onClick={() => onSort(sortKey)}
            >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover/label:text-blue-600 transition-colors">{label}</span>
                <span className="text-slate-300 group-hover/label:text-blue-400">
                    {currentSort.key === sortKey ? (currentSort.dir === 'asc' ? <Icons.ArrowUp className="w-2.5 h-2.5" /> : <Icons.ArrowDown className="w-2.5 h-2.5" />) : <Icons.ChevronsUpDown className="w-2.5 h-2.5 opacity-0 group-hover/label:opacity-100" />}
                </span>
            </div>

            {filterType === 'text' && (
                <input
                    className="w-full px-1.5 py-0.5 text-[10px] border border-slate-200 rounded-sm bg-slate-50/30 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-300 font-medium text-slate-600"
                    placeholder={`Filter...`}
                    value={filterValue || ''}
                    onChange={e => onFilter(e.target.value)}
                    onClick={e => e.stopPropagation()}
                />
            )}

            {filterType === 'multi-select' && (
                <div className="relative" ref={ref}>
                    <div
                        className={`w-full px-1.5 py-0.5 text-[10px] border rounded-sm cursor-pointer flex justify-between items-center transition-all ${(!filterValue || filterValue.length === 0) ? 'bg-slate-50/30 border-slate-200 text-slate-400 hover:bg-white' : 'bg-blue-50/30 border-blue-200 text-blue-600 font-bold'}`}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    >
                        <span className="truncate">
                            {(!filterValue || filterValue.length === 0) ? 'All' : `${filterValue.length} Selected`}
                        </span>
                        <Icons.ChevronDown className="w-2.5 h-2.5 opacity-50" />
                    </div>
                    {isOpen && (
                        <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-300 rounded shadow-xl z-[60] p-1.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex justify-between items-center px-1 pb-1.5 border-b border-slate-100 mb-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select {label}</span>
                                <div className="flex gap-2">
                                    <button className="text-[9px] font-bold text-blue-600 hover:bg-blue-50 px-1 rounded uppercase" onClick={() => onFilter([])}>Clear</button>
                                    <button className="text-[9px] font-bold text-blue-600 hover:bg-blue-50 px-1 rounded uppercase" onClick={() => onFilter(options)}>All</button>
                                </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto scroller space-y-0.5">
                                {options.map(opt => (
                                    <label key={opt} className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded-sm cursor-pointer group/opt">
                                        <input
                                            type="checkbox"
                                            checked={(filterValue || []).includes(opt)}
                                            onChange={() => handleMultiSelect(opt)}
                                            className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                        />
                                        <span className={`text-[11px] font-medium ${(filterValue || []).includes(opt) ? 'text-blue-600' : 'text-slate-600'}`}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {filterType === 'boolean' && (
                <div className="relative">
                    <select
                        className="w-full px-1.5 py-0.5 text-[10px] border border-slate-200 rounded-sm bg-slate-50/30 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all appearance-none cursor-pointer font-medium text-slate-600"
                        value={filterValue || 'All'}
                        onChange={e => onFilter(e.target.value)}
                        onClick={e => e.stopPropagation()}
                    >
                        <option value="All">All Items</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                    <Icons.ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 pointer-events-none" />
                </div>
            )}
        </div>
    );
};