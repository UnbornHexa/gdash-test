import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface User {
  _id: string;
  email: string;
  name?: string;
  isActive: boolean;
  createdAt: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  country?: string;
  state?: string;
  city?: string;
}

interface Country {
  code: string;
  name: string;
}

interface State {
  code: string;
  name: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', country: '', state: '', city: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Location data
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchCountries();
  }, []);

  useEffect(() => {
    if (formData.country) {
      fetchStates(formData.country);
    } else {
      setStates([]);
      setCities([]);
      setFormData(prev => ({ ...prev, state: '', city: '' }));
    }
  }, [formData.country]);

  useEffect(() => {
    if (formData.country && formData.state) {
      fetchCities(formData.country, formData.state);
    } else {
      setCities([]);
      setFormData(prev => ({ ...prev, city: '' }));
    }
  }, [formData.country, formData.state]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await api.get('/users/countries');
      setCountries(response.data);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchStates = async (countryCode: string) => {
    try {
      const response = await api.get(`/users/states/${countryCode}`);
      setStates(response.data);
    } catch (error) {
      console.error('Error fetching states:', error);
      setStates([]);
    }
  };

  const fetchCities = async (countryCode: string, stateCode: string) => {
    try {
      const response = await api.get(`/users/cities/${countryCode}/${stateCode}`);
      setCities(response.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setFormData({ email: '', password: '', name: '', country: '', state: '', city: '' });
      setIsModalOpen(false);
      setStates([]);
      setCities([]);
      fetchUsers();
    } catch (error: any) {
      // Trata mensagens de erro do backend
      let errorMessage = 'Erro ao criar usuário';
      if (error.response?.data) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      // Remove a senha do formData se estiver vazia (para manter a senha atual)
      const updateData = { ...formData };
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }
      
      await api.patch(`/users/${editingUser._id}`, updateData);
      setEditingUser(null);
      setFormData({ email: '', password: '', name: '', country: '', state: '', city: '' });
      setIsModalOpen(false);
      setStates([]);
      setCities([]);
      fetchUsers();
    } catch (error: any) {
      // Trata mensagens de erro do backend
      let errorMessage = 'Erro ao atualizar usuário';
      if (error.response?.data) {
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao excluir usuário');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ 
      email: user.email, 
      password: '', 
      name: user.name || '', 
      country: user.country || '', 
      state: user.state || '', 
      city: user.city || '' 
    });
    setIsModalOpen(true);
    
    // Carrega estados e cidades se o usuário já tiver país/estado
    if (user.country) {
      fetchStates(user.country).then(() => {
        if (user.state) {
          fetchCities(user.country!, user.state);
        }
      });
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', name: '', country: '', state: '', city: '' });
    setStates([]);
    setCities([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ email: '', password: '', name: '', country: '', state: '', city: '' });
    setStates([]);
    setCities([]);
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
        <Button 
          onClick={openCreateModal}
          className="w-full sm:w-auto"
        >
          Criar Usuário
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          closeModal();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Atualize as informações do usuário abaixo' 
                : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingUser ? handleUpdate : handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-email">E-mail</Label>
              <Input
                id="modal-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-password">Senha {editingUser && '(deixe vazio para manter a atual)'}</Label>
              <Input
                id="modal-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-name">Nome (opcional)</Label>
              <Input
                id="modal-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Localização (opcional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-country" className="text-xs">País</Label>
                  <Select
                    id="modal-country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '', city: '' })}
                  >
                    <option value="">Selecione o país</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-state" className="text-xs">Estado</Label>
                  <Select
                    id="modal-state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                    disabled={!formData.country}
                  >
                    <option value="">Selecione o estado</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-city" className="text-xs">Cidade</Label>
                  <Select
                    id="modal-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!formData.state}
                  >
                    <option value="">Selecione a cidade</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                A localização será convertida automaticamente em coordenadas geográficas
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Todos os Usuários</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Gerencie os usuários do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.city && user.state && user.country ? (
                        <span title={user.location ? `Coordenadas: ${user.location.latitude.toFixed(6)}, ${user.location.longitude.toFixed(6)}` : ''}>
                          {user.city}, {user.state}, {user.country}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(user)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(user._id)}>Excluir</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <Card key={user._id} className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">E-mail</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Nome</p>
                    <p className="text-sm text-gray-700">{user.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Criado</p>
                    <p className="text-sm text-gray-700">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Localização</p>
                    <p className="text-sm text-gray-700">
                      {user.city && user.state && user.country ? (
                        <span title={user.location ? `Coordenadas: ${user.location.latitude.toFixed(6)}, ${user.location.longitude.toFixed(6)}` : ''}>
                          {user.city}, {user.state}, {user.country}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => startEdit(user)}
                      className="flex-1"
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(user._id)}
                      className="flex-1"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
