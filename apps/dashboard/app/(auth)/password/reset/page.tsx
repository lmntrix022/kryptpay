'use client';

import { FormEvent, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Key, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialToken = useMemo(() => searchParams?.get('token') ?? '', [searchParams]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!response.ok) {
        throw new Error('Impossible de réinitialiser le mot de passe.');
      }

      setCompleted(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3 tracking-tight">
            Mot de passe mis à jour !
          </h1>
          <p className="text-zinc-400 text-sm mb-6">
            Redirection vers la connexion...
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
          <ShieldCheck className="w-7 h-7 text-violet-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">
          Nouveau mot de passe
        </h1>
        <p className="text-zinc-400 text-sm">
          Choisissez un mot de passe solide pour sécuriser votre compte.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Token Field */}
        {!initialToken && (
          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-medium text-zinc-300">
              Jeton de réinitialisation
            </label>
            <div className="relative group">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur opacity-0 transition-opacity duration-300 ${focusedField === 'token' ? 'opacity-30' : 'group-hover:opacity-20'}`} />
              
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Key className="w-5 h-5" />
                </div>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  onFocus={() => setFocusedField('token')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="Collez votre jeton ici"
                  disabled={loading}
                  className="w-full h-14 pl-12 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-300 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Nouveau mot de passe
          </label>
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur opacity-0 transition-opacity duration-300 ${focusedField === 'password' ? 'opacity-30' : 'group-hover:opacity-20'}`} />
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                minLength={8}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full h-14 pl-12 pr-14 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-white/[0.05]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">
            Minimum 8 caractères avec majuscules, minuscules et chiffres.
          </p>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300">
            Confirmer le mot de passe
          </label>
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur opacity-0 transition-opacity duration-300 ${focusedField === 'confirm' ? 'opacity-30' : 'group-hover:opacity-20'}`} />
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                required
                minLength={8}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full h-14 pl-12 pr-14 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-white/[0.05]"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="relative w-full h-14 mt-2 group overflow-hidden rounded-xl font-medium text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 bg-[length:200%_100%] group-hover:animate-gradient-x transition-all duration-300" />
          
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          
          <div className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Réinitialisation...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Réinitialiser le mot de passe</span>
              </>
            )}
          </div>
        </button>
      </form>

      {/* Back links */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/password/request"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Demander un nouveau jeton
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Retour à la connexion</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
            <ShieldCheck className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">
            Nouveau mot de passe
          </h1>
          <p className="text-zinc-400 text-sm">
            Chargement...
          </p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
