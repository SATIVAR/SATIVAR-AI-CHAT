'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Trash2, Mail, User, Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AssociationManager {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  isActive: boolean
}

interface UserManagementTabProps {
  associationId: string
}

export function UserManagementTab({ associationId }: UserManagementTabProps) {
  const [managers, setManagers] = useState<AssociationManager[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' })
  const { toast } = useToast()

  // Carregar lista de gerentes
  const loadManagers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/associations/${associationId}/users`)
      const data = await response.json()
      
      if (response.ok) {
        setManagers(data.managers)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar gerentes:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lista de gerentes',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (associationId) {
      loadManagers()
    }
  }, [associationId])

  // Convidar novo gerente
  const handleInviteManager = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e email',
        variant: 'destructive'
      })
      return
    }

    setIsInviting(true)
    try {
      const response = await fetch(`/api/admin/associations/${associationId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteForm.email,
          name: inviteForm.name
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: result.message
        })
        setInviteForm({ name: '', email: '' })
        setShowInviteDialog(false)
        loadManagers() // Recarregar lista
      } else {
        toast({
          title: 'Erro',
          description: result.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao convidar gerente:', error)
      toast({
        title: 'Erro',
        description: 'Erro interno. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsInviting(false)
    }
  }

  // Remover gerente
  const handleRemoveManager = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja remover ${userName} como gerente desta associação?`
    )
    
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/associations/${associationId}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: result.message
        })
        loadManagers() // Recarregar lista
      } else {
        toast({
          title: 'Erro',
          description: result.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Erro ao remover gerente:', error)
      toast({
        title: 'Erro',
        description: 'Erro interno. Tente novamente.',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciamento de Usuários</CardTitle>
            <CardDescription>
              Gerencie os usuários que podem acessar esta associação
            </CardDescription>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Gerente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Gerente</DialogTitle>
                <DialogDescription>
                  Adicione um novo gerente para esta associação. Ele receberá acesso apenas aos dados desta associação.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Nome</Label>
                  <Input
                    id="invite-name"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo do gerente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteDialog(false)}
                  disabled={isInviting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleInviteManager}
                  disabled={isInviting}
                >
                  {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Convite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Informações sobre RBAC */}
        <Alert className="mb-6">
          <User className="h-4 w-4" />
          <AlertDescription>
            <strong>Sistema de Controle de Acesso:</strong> Os gerentes têm acesso apenas aos dados desta associação. 
            Super administradores podem gerenciar todas as associações da plataforma.
          </AlertDescription>
        </Alert>

        {/* Lista de Gerentes */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Carregando gerentes...
          </div>
        ) : managers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum gerente cadastrado</p>
            <p className="text-sm">Adicione gerentes para permitir que outras pessoas administrem esta associação</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Gerentes da Associação</h3>
              <Badge variant="secondary">
                {managers.length} {managers.length === 1 ? 'gerente' : 'gerentes'}
              </Badge>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {manager.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {manager.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {manager.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(manager.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManager(manager.id, manager.name)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Informações sobre Convites */}
        <div className="space-y-3">
          <h4 className="font-medium">Como funciona o convite:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• O gerente receberá um email com link para definir sua senha</li>
            <li>• Ele terá acesso apenas aos dados desta associação</li>
            <li>• O link de convite expira em 7 dias</li>
            <li>• Gerentes podem acessar o painel de atendimento e configurações básicas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}