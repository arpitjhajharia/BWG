import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export const LoginScreen = ({ actions }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const handleLoginError = (event) => {
            setError(event.detail || "You are not authorized to access this system.");
            setLoading(false);
        };
        window.addEventListener('login-error', handleLoginError);
        return () => window.removeEventListener('login-error', handleLoginError);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await actions.login(email, password);
        } catch (err) {
            setError('Invalid email or password');
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await actions.loginWithGoogle();
        } catch (err) {
            setError('Google sign-in failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-slate-100">
            <Card className="w-96 p-8 shadow-xl">
                <img
                    src={`${import.meta.env.BASE_URL}logo.png`}
                    alt="Biowearth"
                    className="h-24 mx-auto mb-6 object-contain"
                />

                <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 mb-6 border-slate-200 hover:bg-slate-50 py-6"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </Button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Or use email</span></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    {error && <div className="text-red-500 text-[11px] text-center font-bold bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</div>}
                    <Button type="submit" className="w-full py-6 font-bold" disabled={loading}>
                        {loading ? 'Processing...' : 'Login'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};