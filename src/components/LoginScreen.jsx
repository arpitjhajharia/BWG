import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export const LoginScreen = ({ userProfiles, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        const foundUser = userProfiles.find(u => u.username === username && u.password === password);
        if (foundUser) {
            onLogin(foundUser);
        } else {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-slate-100">
            <Card className="w-96 p-8 shadow-xl">
                <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="Biowearth"
                    className="h-32 mx-auto mb-4 object-contain"
                />
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input className="w-full p-2 border rounded" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input type="password" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    {error && <div className="text-red-500 text-xs text-center">{error}</div>}
                    <Button className="w-full" onClick={handleLogin}>Login</Button>
                </form>
            </Card>
        </div>
    );
};