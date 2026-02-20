import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, appId } from '../config/firebase';

export const useBiowearthData = () => {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Data State - Ensure 'ors' and 'rfqs' are initialized
    const [data, setData] = useState({
        products: [], skus: [], vendors: [], clients: [], contacts: [],
        quotesReceived: [], quotesSent: [], tasks: [], orders: [], formulations: [],
        ors: [], rfqs: [], inventoryInwards: [], inventoryOutwards: [],
        userProfiles: [], settings: {}
    });

    // CRUD Actions
    const actions = {
        add: (col, item) => addDoc(collection(db, `artifacts/${appId}/public/data`, col), { ...item, createdAt: serverTimestamp() }),
        update: (col, id, item) => updateDoc(doc(db, `artifacts/${appId}/public/data`, col, id), item),
        del: (col, id) => confirm("Delete this record?") && deleteDoc(doc(db, `artifacts/${appId}/public/data`, col, id)),
        updateSetting: (key, newList) => setDoc(doc(db, `artifacts/${appId}/public/data`, 'settings', key), { list: newList })
    };

    useEffect(() => {
        signInAnonymously(auth).catch(console.error);

        return onAuthStateChanged(auth, (u) => {
            if (u) {
                const path = `artifacts/${appId}/public/data`;
                const unsubscribes = [
                    onSnapshot(collection(db, path, 'products'), s => setData(p => ({ ...p, products: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'skus'), s => setData(p => ({ ...p, skus: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'vendors'), s => setData(p => ({ ...p, vendors: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'clients'), s => setData(p => ({ ...p, clients: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'contacts'), s => setData(p => ({ ...p, contacts: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'quotesReceived'), s => setData(p => ({ ...p, quotesReceived: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'quotesSent'), s => setData(p => ({ ...p, quotesSent: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'tasks'), s => setData(p => ({ ...p, tasks: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'orders'), s => setData(p => ({ ...p, orders: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'formulations'), s => setData(p => ({ ...p, formulations: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),

                    // --- NEW LISTENERS ADDED HERE ---
                    onSnapshot(collection(db, path, 'ors'), s => setData(p => ({ ...p, ors: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'rfqs'), s => setData(p => ({ ...p, rfqs: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'inventoryInwards'), s => setData(p => ({ ...p, inventoryInwards: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'inventoryOutwards'), s => setData(p => ({ ...p, inventoryOutwards: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    // --------------------------------

                    onSnapshot(collection(db, path, 'users'), s => {
                        const users = s.docs.map(d => ({ id: d.id, ...d.data() }));
                        setData(p => ({ ...p, userProfiles: users }));
                        if (!users.some(u => u.username === 'admin')) {
                            addDoc(collection(db, path, 'users'), { name: 'System Admin', username: 'admin', password: 'password123', role: 'Admin', createdAt: serverTimestamp() });
                        }
                    }),
                    onSnapshot(collection(db, path, 'settings'), s => {
                        const newSettings = {};
                        let hasData = false;
                        s.docs.forEach(d => {
                            newSettings[d.id] = d.data().list || [];
                            hasData = true;
                        });
                        if (!hasData) {
                            // Default settings if empty
                            const defaults = {
                                formats: ['Powder', 'Liquid', 'Tablet', 'Capsule', 'Gummy', 'Sachet'],
                                units: ['g', 'kg', 'ml', 'L', 'pcs'],
                                packTypes: ['Jar', 'Pouch', 'Sachet', 'Bottle', 'Box'],
                                leadSources: ['LinkedIn', 'Website', 'Referral', 'Cold Call'],
                                leadStatuses: ['Lead', 'Active', 'Negotiation', 'Churned'],
                                leadStatusGroups: { 'Lead': 'In-progress', 'Active': 'In-progress', 'Negotiation': 'In-progress', 'Churned': 'Complete' },
                                taskGroups: ['Marketing', 'Admin', 'Website', 'HR', 'Operations'],
                                vendorStatuses: ['Active', 'On Hold', 'Potential', 'Blacklisted']
                            };
                            Object.keys(defaults).forEach(key => {
                                setDoc(doc(db, path, 'settings', key), { list: defaults[key] });
                            });
                        } else {
                            setData(p => ({ ...p, settings: { ...p.settings, ...newSettings } }));
                        }
                    })
                ];
                setLoading(false);
                return () => unsubscribes.forEach(fn => fn());
            }
        });
    }, []);

    return { loading, data, actions, currentUser, setCurrentUser };
};