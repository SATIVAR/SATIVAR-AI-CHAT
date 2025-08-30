'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Building2 } from 'lucide-react'

interface UserSession {
  id: string
  email: string
  name: string
  role?: 'super_admin' | 'manager'
  associationId?: string
  associationName?: string
}

export default function TestRBACPage() {
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSession = () => {
      try {
        const authCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-session='))

        if (authCookie) {
          const sessionData = JSON.parse(decodeURIComponent(authCookie.split('=')[1]))
          setUserSession(sessionData)
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Teste do Sistema RBAC</h1>
          <p className="text-gray-600 mt-2">Verificação do sistema de controle de acesso</p>
        </div>

        {userSession ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Informações do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>Nome:</strong> {userSession.name}
                </div>
                <div>
                  <strong>Email:</strong> {userSession.email}
                </div>
                <div>
                  <strong>ID:</strong> {userSession.id}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Permissões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <strong>Função:</strong>
                  <Badge variant={userSession.role === 'super_admin' ? 'default' : 'secondary'}>
                    {userSession.role === 'super_admin' ? 'Super Admin' : 'Gerente'}
                  </Badge>
                </div>
                
                {userSession.role === 'manager' && (
                  <>
                    <div>
                      <strong>Associação ID:</strong> {userSession.associationId}
                    </div>
                    <div>
                      <strong>Associação:</strong> {userSession.associationName}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Acesso Permitido
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userSession.role === 'super_admin' ? (
                  <div className="space-y-2">
                    <p className="text-green-600 font-medium">✅ Acesso total à plataforma</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Gerenciar todas as associações</li>
                      <li>Visualizar todos os dados</li>
                      <li>Convidar e remover gerentes</li>
                      <li>Configurações globais do sistema</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-blue-600 font-medium">🔒 Acesso restrito à associação</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>Gerenciar apenas sua associação: {userSession.associationName}</li>
                      <li>Visualizar dados da associação</li>
                      <li>Atendimento ao cliente</li>
                      <li>Configurações básicas</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Não Autenticado</CardTitle>
              <CardDescription>
                Você não está logado no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/login'}>
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/admin/dashboard'}>
              Ir para Dashboard
            </Button>
            {userSession && (
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}