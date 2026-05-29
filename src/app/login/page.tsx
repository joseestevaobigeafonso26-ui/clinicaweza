'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PawPrint, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      toast.success('Bem-vindo!')
      router.push('/dashboard')
    } catch {
      toast.error('Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg">
              <PawPrint size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clínica WEZA</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Sistema de Controlo de Pets</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="seu@email.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <input {...register('password')} type={showPwd ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Credenciais de Teste</p>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <p>Admin: admin@weza.ao / admin123</p>
              <p>Veterinário: vet@weza.ao / vet123</p>
              <p>Rececionista: recep@weza.ao / recep123</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">© 2024 Clínica Veterinária WEZA</p>
      </div>
    </div>
  )
}
