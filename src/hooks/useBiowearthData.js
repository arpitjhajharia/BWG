import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, setDoc, serverTimestamp, query, where, limit, getDocs, getDoc } from "firebase/firestore";
import { auth, db, appId } from '../config/firebase';

export const useBiowearthData = () => {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Data State
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
        set: (col, id, item) => setDoc(doc(db, `artifacts/${appId}/public/data`, col, id), { ...item, updatedAt: serverTimestamp() }),
        del: (col, id) => deleteDoc(doc(db, `artifacts/${appId}/public/data`, col, id)),
        delMany: (items) => Promise.all(items.map(item => deleteDoc(doc(db, `artifacts/${appId}/public/data`, item.col, item.id)))),
        updateSetting: (key, newList) => setDoc(doc(db, `artifacts/${appId}/public/data`, 'settings', key), { list: newList }),

        // Auth Actions
        login: async (email, password) => {
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                return userCredential.user;
            } catch (error) {
                console.error("Login failed:", error);
                throw error;
            }
        },
        loginWithGoogle: async () => {
            try {
                const provider = new GoogleAuthProvider();
                const userCredential = await signInWithPopup(auth, provider);
                return userCredential.user;
            } catch (error) {
                console.error("Google Login failed:", error);
                throw error;
            }
        },
        logout: () => signOut(auth)
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch the user's role/profile from our users collection
                const path = `artifacts/${appId}/public/data`;
                const userDocRef = doc(db, path, 'users', user.email);
                const userDocSnap = await getDoc(userDocRef);

                let userData = null;
                let userId = null;

                if (userDocSnap.exists()) {
                    userData = userDocSnap.data();
                    userId = userDocSnap.id;
                } else {
                    // Fallback to query if document ID isn't email yet
                    const userQuery = query(collection(db, path, 'users'), where("email", "==", user.email), limit(1));
                    const userSnap = await getDocs(userQuery);
                    if (!userSnap.empty) {
                        userData = userSnap.docs[0].data();
                        userId = userSnap.docs[0].id;
                    }
                }

                if (!userData) {
                    await signOut(auth);
                    setCurrentUser(null);
                    setLoading(false);
                    // Emit a custom event so the login screen can catch it, or just throw
                    window.dispatchEvent(new CustomEvent('login-error', { detail: 'Account strictly not whitelisted.' }));
                    return;
                }
                const profile = {
                    id: userId,
                    ...userData,
                    name: userData.name || user.displayName || user.email,
                    email: user.email,
                    role: userData.role || 'Staff'
                };

                setCurrentUser(profile);

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
                    onSnapshot(collection(db, path, 'ors'), s => setData(p => ({ ...p, ors: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'rfqs'), s => setData(p => ({ ...p, rfqs: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'inventoryInwards'), s => setData(p => ({ ...p, inventoryInwards: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'inventoryOutwards'), s => setData(p => ({ ...p, inventoryOutwards: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
                    onSnapshot(collection(db, path, 'users'), s => {
                        const users = s.docs.map(d => ({ id: d.id, ...d.data() }));
                        setData(p => ({ ...p, userProfiles: users }));
                    }),
                    onSnapshot(collection(db, path, 'settings'), s => {
                        const newSettings = {};
                        s.docs.forEach(d => { newSettings[d.id] = d.data().list || []; });
                        setData(p => ({ ...p, settings: { ...p.settings, ...newSettings } }));
                    })
                ];
                setLoading(false);
                return () => unsubscribes.forEach(fn => fn());
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    return { loading, data, actions, currentUser };
};