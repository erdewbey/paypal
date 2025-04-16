import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, AlertTriangle, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idNumber: "",
    birthDate: ""
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [enable2FA, setEnable2FA] = useState(false);
  
  // Kimlik doğrulama state'i
  const [identityVerification, setIdentityVerification] = useState<{
    frontIdImage: File | null;
    backIdImage: File | null;
    selfieImage: File | null;
    status: string;
  }>({
    frontIdImage: null,
    backIdImage: null,
    selfieImage: null,
    status: user?.identityVerified ? "verified" : "unverified"
  });
  
  // Kimlik doğrulama mutasyonu
  const identityVerificationMutation = useMutation({
    mutationFn: async (files: {
      frontIdImage: File;
      backIdImage: File;
      selfieImage: File;
    }) => {
      const formData = new FormData();
      formData.append("frontId", files.frontIdImage);
      formData.append("backId", files.backIdImage);
      formData.append("selfie", files.selfieImage);
      
      // CSRF token'ı alıp kullanma
      let csrfToken = '';
      try {
        const csrfResponse = await fetch('/api/csrf-token', {
          credentials: 'include'
        });
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken;
      } catch (error) {
        console.error("CSRF token alınamadı:", error);
      }
      
      const res = await fetch("/api/identity-verification", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          'csrf-token': csrfToken
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || res.statusText);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Kimlik doğrulama talebi gönderildi",
        description: "Belgelerin incelendikten sonra kimliğiniz doğrulanacaktır. Bu işlem genellikle 24-48 saat içinde tamamlanır."
      });
      setIdentityVerification(prev => ({
        ...prev,
        status: "pending"
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Kimlik doğrulama başarısız",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Dosya input referansları
  const frontIdRef = useRef<HTMLInputElement>(null);
  const backIdRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  
  // Update form when user data is available
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        idNumber: user.idNumber || "",
        birthDate: user.birthDate || ""
      });
      setEnable2FA(user.isTwoFactorEnabled);
      
      // Kimlik doğrulama durumu güncelleme
      setIdentityVerification(prev => ({
        ...prev,
        status: user.identityVerified ? "verified" : "unverified"
      }));
    }
  }, [user]);
  
  // Responsive handling
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil güncellendi",
        description: "Bilgileriniz başarıyla güncellendi."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Güncelleme başarısız",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Şifre değiştirildi",
        description: "Şifreniz başarıyla değiştirildi."
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Şifre değiştirme başarısız",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Enable/disable 2FA mutation
  const toggle2FAMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const endpoint = enable ? "/api/enable-2fa" : "/api/disable-2fa";
      const res = await apiRequest("POST", endpoint, {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: enable2FA ? "2FA etkinleştirildi" : "2FA devre dışı bırakıldı",
        description: enable2FA 
          ? "İki faktörlü doğrulama başarıyla etkinleştirildi." 
          : "İki faktörlü doğrulama devre dışı bırakıldı."
      });
      
      // If 2FA was enabled, we might need to show setup instructions
      if (data.qrCode) {
        // In a real app, we would show the QR code here
        toast({
          title: "2FA Kurulumu",
          description: "Lütfen Google Authenticator veya benzer bir uygulama ile QR kodu tarayın."
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "2FA işlemi başarısız",
        description: error.message,
        variant: "destructive"
      });
      // Reset the switch to its previous state
      setEnable2FA(!enable2FA);
    }
  });
  
  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateProfileMutation.mutate({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone
      // Note: Email changes typically require verification in a real app
    });
  };
  
  // Handle password form submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Şifreler eşleşmiyor",
        description: "Lütfen şifrelerin aynı olduğundan emin olun.",
        variant: "destructive"
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };
  
  // Handle 2FA toggle
  const handle2FAToggle = (checked: boolean) => {
    setEnable2FA(checked);
    toggle2FAMutation.mutate(checked);
  };
  
  // Handle identity verification submission
  const handleIdentityVerification = () => {
    if (!identityVerification.frontIdImage || !identityVerification.backIdImage || !identityVerification.selfieImage) {
      toast({
        title: "Eksik belgeler",
        description: "Lütfen kimlik kartınızın ön ve arka yüzünü ve kimliğinizle birlikte selfie'nizi yükleyin.",
        variant: "destructive"
      });
      return;
    }
    
    identityVerificationMutation.mutate({
      frontIdImage: identityVerification.frontIdImage,
      backIdImage: identityVerification.backIdImage,
      selfieImage: identityVerification.selfieImage
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <div className="lg:hidden fixed top-0 left-0 z-40 w-full">
          <div className="bg-white shadow-md p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1L1 7l11 6 11-6-11-6zM1 17l11 6 11-6M1 12l11 6 11-6"/>
                </svg>
                <span className="font-bold text-lg text-primary">TRY Exchange</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowMobileSidebar(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        isMobile={isMobile} 
        showMobileSidebar={showMobileSidebar}
        onCloseMobileSidebar={() => setShowMobileSidebar(false)} 
        activePage="profile"
      />

      {/* Main content */}
      <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
        <div className="py-6">
          {/* Page header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
            <div className="lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mt-10 lg:mt-0">
                  Profil
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Hesap bilgilerinizi yönetin ve güvenlik ayarlarınızı güncelleyin.
                </p>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {/* User profile summary */}
            <div className="bg-white p-6 shadow rounded-lg mb-6">
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&size=96`} />
                  <AvatarFallback className="text-2xl">{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <p className="text-gray-500">{user?.phone}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${user?.isVerified ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    <span className="text-sm text-gray-500">
                      {user?.isVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <Tabs defaultValue="profile" className="mb-6">
              <TabsList className="mb-6 w-full lg:w-auto">
                <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
                <TabsTrigger value="security">Güvenlik</TabsTrigger>
              </TabsList>
              
              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profil Bilgileri</CardTitle>
                    <CardDescription>Kişisel bilgilerinizi güncelleyin.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleProfileSubmit}>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Ad</Label>
                          <Input 
                            id="firstName"
                            value={profileData.firstName}
                            disabled
                            readOnly
                          />
                          <p className="text-xs text-gray-500">İsim değiştirilemez.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Soyad</Label>
                          <Input 
                            id="lastName"
                            value={profileData.lastName}
                            disabled
                            readOnly
                          />
                          <p className="text-xs text-gray-500">Soyisim değiştirilemez.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">E-posta</Label>
                        <Input 
                          id="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          type="email"
                          disabled // Email changes typically require verification
                        />
                        <p className="text-xs text-gray-500">E-posta adresinizi değiştirmek için lütfen destek ile iletişime geçin.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon Numarası</Label>
                        <Input 
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="idNumber">TC Kimlik Numarası</Label>
                        <Input 
                          id="idNumber"
                          value={profileData.idNumber}
                          disabled
                          readOnly
                        />
                        <p className="text-xs text-gray-500">TC Kimlik Numarası değiştirilemez.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="birthDate">Doğum Tarihi</Label>
                        <Input 
                          id="birthDate"
                          value={profileData.birthDate}
                          disabled
                          readOnly
                        />
                        <p className="text-xs text-gray-500">Doğum tarihi değiştirilemez.</p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Güncelleniyor...</>
                        ) : (
                          "Profili Güncelle"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              
              {/* Security Tab */}
              <TabsContent value="security">
                <div className="space-y-6">
                  {/* Change Password */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Şifre Değiştir</CardTitle>
                      <CardDescription>Güvenliğiniz için düzenli olarak şifrenizi değiştirin.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handlePasswordSubmit}>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                          <Input 
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Yeni Şifre</Label>
                          <Input 
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            required
                          />
                          <p className="text-xs text-gray-500">En az 8 karakter, büyük/küçük harf ve rakam içermeli.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Yeni Şifre Tekrar</Label>
                          <Input 
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            required
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                        >
                          {changePasswordMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Değiştiriliyor...</>
                          ) : (
                            "Şifreyi Değiştir"
                          )}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                  
                  {/* Two-Factor Authentication */}
                  <Card>
                    <CardHeader>
                      <CardTitle>İki Faktörlü Doğrulama (2FA)</CardTitle>
                      <CardDescription>Hesabınıza ekstra bir güvenlik katmanı ekleyin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">İki Faktörlü Doğrulama</h4>
                          <p className="text-sm text-gray-500">Google Authenticator veya benzer uygulamalar kullanarak hesabınızı koruyun.</p>
                        </div>
                        <Switch
                          checked={enable2FA}
                          onCheckedChange={handle2FAToggle}
                          disabled={toggle2FAMutation.isPending}
                        />
                      </div>
                      
                      {enable2FA && (
                        <div className="rounded-md bg-blue-50 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                2FA etkinleştirildi. Giriş yaparken 6 haneli doğrulama kodu istenecektir.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Kimlik Doğrulama */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Kimlik Doğrulama</CardTitle>
                      <CardDescription>Hesabınızı doğrulayın ve işlemlerinizi güvenle gerçekleştirin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {identityVerification.status === "verified" ? (
                        <Alert className="bg-green-50 border-green-200">
                          <BadgeCheck className="h-5 w-5 text-green-500" />
                          <AlertTitle className="text-green-800">Doğrulanmış Hesap</AlertTitle>
                          <AlertDescription className="text-green-700">
                            Kimliğiniz doğrulanmıştır. Tüm işlemleri gerçekleştirebilirsiniz.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <AlertTitle className="text-amber-800">Doğrulanmamış Hesap</AlertTitle>
                            <AlertDescription className="text-amber-700">
                              Kimliğinizi doğrulamak için lütfen aşağıdaki belgeleri yükleyin. Doğrulama işlemi genellikle 24-48 saat içinde tamamlanır.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor="frontId">Kimlik Ön Yüzü</Label>
                              <div className="relative border-2 border-dashed rounded-md p-4 h-40 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
                                <input
                                  type="file"
                                  id="frontId"
                                  className="hidden"
                                  ref={frontIdRef}
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIdentityVerification(prev => ({
                                        ...prev,
                                        frontIdImage: file
                                      }));
                                    }
                                  }}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  type="button"
                                  onClick={() => frontIdRef.current?.click()}
                                  className="mb-2"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Kimlik Ön Yüzü
                                </Button>
                                <p className="text-xs text-gray-500 text-center">
                                  {identityVerification.frontIdImage 
                                    ? identityVerification.frontIdImage.name
                                    : "Henüz dosya seçilmedi"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="backId">Kimlik Arka Yüzü</Label>
                              <div className="relative border-2 border-dashed rounded-md p-4 h-40 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
                                <input
                                  type="file"
                                  id="backId"
                                  className="hidden"
                                  ref={backIdRef}
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIdentityVerification(prev => ({
                                        ...prev,
                                        backIdImage: file
                                      }));
                                    }
                                  }}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  type="button"
                                  onClick={() => backIdRef.current?.click()}
                                  className="mb-2"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Kimlik Arka Yüzü
                                </Button>
                                <p className="text-xs text-gray-500 text-center">
                                  {identityVerification.backIdImage 
                                    ? identityVerification.backIdImage.name
                                    : "Henüz dosya seçilmedi"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="selfie">Kimlik ile Selfie</Label>
                              <div className="relative border-2 border-dashed rounded-md p-4 h-40 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
                                <input
                                  type="file"
                                  id="selfie"
                                  className="hidden"
                                  ref={selfieRef}
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIdentityVerification(prev => ({
                                        ...prev,
                                        selfieImage: file
                                      }));
                                    }
                                  }}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  type="button"
                                  onClick={() => selfieRef.current?.click()}
                                  className="mb-2"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Kimlik ile Selfie
                                </Button>
                                <p className="text-xs text-gray-500 text-center">
                                  {identityVerification.selfieImage 
                                    ? identityVerification.selfieImage.name
                                    : "Henüz dosya seçilmedi"}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-4">
                            <Button 
                              disabled={!identityVerification.frontIdImage || !identityVerification.backIdImage || !identityVerification.selfieImage || identityVerificationMutation.isPending}
                              onClick={handleIdentityVerification}
                            >
                              {identityVerificationMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İşleniyor...</>
                              ) : (
                                "Doğrulama İsteği Gönder"
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer space */}
            <div className="h-16"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
