import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Check, X, Edit, Save, CheckCircle2, XCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminUsers() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // State for editing user
  const [userUpdates, setUserUpdates] = useState({
    isVerified: false,
    isAdmin: false,
    balance: "",
    isTwoFactorEnabled: false,
    identityVerified: false,
  });

  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kullanıcı bilgileri yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, userData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({
        title: "Başarılı",
        description: "Kullanıcı bilgileri güncellendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kullanıcı güncellenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserUpdates({
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      balance: user.balance,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      identityVerified: user.identityVerified,
    });
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        userData: userUpdates,
      });
    }
  };

  const filteredUsers = users?.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <Sidebar
            isMobile={isMobile}
            showMobileSidebar={showMobileSidebar}
            onCloseMobileSidebar={() => setShowMobileSidebar(false)}
            activePage="admin-users"
          />
          
          <div className="flex flex-col flex-1">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Sidebar
          isMobile={isMobile}
          showMobileSidebar={showMobileSidebar}
          onCloseMobileSidebar={() => setShowMobileSidebar(false)}
          activePage="admin-users"
        />
        
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
              
              <div className="w-full md:w-auto">
                <Input
                  placeholder="Kullanıcı ara..."
                  className="w-full md:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-auto rounded-lg shadow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Kullanıcı Adı</TableHead>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Doğrulanmış</TableHead>
                    <TableHead>Kimlik</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Bakiye</TableHead>
                    <TableHead>2FA</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isVerified ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.identityVerified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Onaylandı</Badge>
                        ) : user.identityDocuments && user.identityDocuments.length > 0 ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Beklemede</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Yok</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>₺{user.balance}</TableCell>
                      <TableCell>
                        {user.isTwoFactorEnabled ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Düzenle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-6 text-gray-500">
                        Gösterilecek kullanıcı bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
        </div>
      </div>
      
      {/* Edit User Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-lg font-semibold">
                  {editingUser.firstName} {editingUser.lastName}
                </h3>
                <p className="text-sm text-gray-500">@{editingUser.username}</p>
                <p className="text-sm text-gray-500">{editingUser.email}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="verified"
                    checked={userUpdates.isVerified}
                    onCheckedChange={(checked) => setUserUpdates({ ...userUpdates, isVerified: checked })}
                  />
                  <Label htmlFor="verified">E-posta Doğrulanmış</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="identity"
                    checked={userUpdates.identityVerified}
                    onCheckedChange={(checked) => setUserUpdates({ ...userUpdates, identityVerified: checked })}
                  />
                  <Label htmlFor="identity">Kimlik Onaylandı</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="admin"
                    checked={userUpdates.isAdmin}
                    onCheckedChange={(checked) => setUserUpdates({ ...userUpdates, isAdmin: checked })}
                  />
                  <Label htmlFor="admin">Admin</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="2fa"
                    checked={userUpdates.isTwoFactorEnabled}
                    onCheckedChange={(checked) => setUserUpdates({ ...userUpdates, isTwoFactorEnabled: checked })}
                  />
                  <Label htmlFor="2fa">2FA Etkin</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="balance">Bakiye (TL)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={userUpdates.balance}
                  onChange={(e) => setUserUpdates({ ...userUpdates, balance: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              İptal
            </Button>
            <Button 
              onClick={handleSaveUser} 
              disabled={updateUserMutation.isPending}
              className="flex items-center gap-1"
            >
              {updateUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}