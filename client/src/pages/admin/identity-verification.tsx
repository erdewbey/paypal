import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function AdminIdentityVerification() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewImageDialog, setViewImageDialog] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Fetch users with pending identity verification
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/users"],
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kullanıcı bilgileri yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users with identityDocuments but not verified yet
  const pendingUsers = users?.filter(
    (user) => user.identityDocuments && user.identityDocuments.length > 0 && !user.identityVerified
  );

  // Filter users with verified identity
  const verifiedUsers = users?.filter(
    (user) => user.identityVerified
  );

  // Approve identity verification mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/users/${userId}/verify-identity`,
        { verified: true }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kimlik doğrulama onaylandı.",
      });
      refetch();
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kimlik doğrulama onaylanırken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Reject identity verification mutation
  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/users/${userId}/verify-identity`,
        { verified: false }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Kimlik doğrulama reddedildi.",
      });
      refetch();
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kimlik doğrulama reddedilirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewImage = (imagePath: string) => {
    setCurrentImage(imagePath);
    setViewImageDialog(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (error) {
      return "Geçersiz tarih";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <Sidebar
            isMobile={isMobile}
            showMobileSidebar={showMobileSidebar}
            onCloseMobileSidebar={() => setShowMobileSidebar(false)}
            activePage="admin-identity-verification"
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
          activePage="admin-identity-verification"
        />
        
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Kimlik Doğrulama İşlemleri</h1>
            </div>
            
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">
                  Bekleyen Doğrulamalar
                  {pendingUsers && pendingUsers.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingUsers.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="verified">Onaylanmış Doğrulamalar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bekleyen Kimlik Doğrulama İstekleri</CardTitle>
                    <CardDescription>
                      Kullanıcıların kimlik doğrulama taleplerini inceleyip onaylayabilir veya reddedebilirsiniz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingUsers && pendingUsers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kullanıcı ID</TableHead>
                            <TableHead>Ad Soyad</TableHead>
                            <TableHead>E-posta</TableHead>
                            <TableHead>Tarih</TableHead>
                            <TableHead>İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.id}</TableCell>
                              <TableCell>{user.firstName} {user.lastName}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{formatDate(user.updatedAt)}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    İncele
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        Bekleyen kimlik doğrulama isteği bulunmamaktadır.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="verified" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Onaylanmış Kimlik Doğrulamaları</CardTitle>
                    <CardDescription>
                      Kimlik doğrulama işlemi tamamlanmış kullanıcılar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {verifiedUsers && verifiedUsers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kullanıcı ID</TableHead>
                            <TableHead>Ad Soyad</TableHead>
                            <TableHead>E-posta</TableHead>
                            <TableHead>Onay Tarihi</TableHead>
                            <TableHead>Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verifiedUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.id}</TableCell>
                              <TableCell>{user.firstName} {user.lastName}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{formatDate(user.updatedAt)}</TableCell>
                              <TableCell>
                                <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Onaylandı
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        Onaylanmış kimlik doğrulama bulunmamaktadır.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Kimlik Doğrulama İnceleme Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Kimlik Doğrulama İncelemesi</DialogTitle>
              <DialogDescription>
                {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email}) kullanıcısının kimlik belgeleri.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              {selectedUser.identityDocuments && selectedUser.identityDocuments.map((doc: string, index: number) => (
                <div key={index} className="relative border rounded-md overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 w-8 p-0" 
                      onClick={() => handleViewImage(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <img 
                    src={doc.startsWith('/uploads') ? doc : `/uploads/${doc}`} 
                    alt={`Kimlik belgesi ${index + 1}`} 
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => handleViewImage(doc.startsWith('/uploads') ? doc : `/uploads/${doc}`)}
                  />
                  <div className="p-2 bg-gray-50 text-xs font-medium">
                    {index === 0 && "Kimlik Ön Yüz"}
                    {index === 1 && "Kimlik Arka Yüz"}
                    {index === 2 && "Selfie"}
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedUser(null)}
              >
                Kapat
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => rejectMutation.mutate(selectedUser.id)}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reddet
              </Button>
              <Button 
                variant="default" 
                className="flex-1"
                onClick={() => approveMutation.mutate(selectedUser.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Onayla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Resim Görüntüleme Dialog */}
      <Dialog open={viewImageDialog} onOpenChange={setViewImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Kimlik Belgesi Görüntüleme</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            {currentImage && (
              <img 
                src={currentImage} 
                alt="Kimlik belgesi" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewImageDialog(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}