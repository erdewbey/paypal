import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { FaExchangeAlt, FaWallet, FaHistory } from "react-icons/fa";
import { setCsrfToken } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AuthPage() {
  const { user, loginMutation, registerMutation, forgotPasswordMutation, resetPasswordMutation } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // URL parametreleri
  const urlParams = new URLSearchParams(window.location.search);
  const isVerified = urlParams.get('verified') === 'true';
  
  // E-posta doğrulama mesajı
  useEffect(() => {
    if (isVerified) {
      toast({
        title: "E-posta doğrulandı",
        description: "E-posta adresiniz başarıyla doğrulandı. Şimdi giriş yapabilirsiniz.",
        variant: "default",
      });
    }
  }, [isVerified, toast]);
  
  // Form states
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    idNumber: "", // TC Kimlik Numarası
    birthDate: "", // Doğum tarihi
    password: "",
    confirmPassword: ""
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetPasswordData, setResetPasswordData] = useState({
    token: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  
  // Şifre sıfırlama token'ı URL'den alınıyor mu kontrol et
  const resetToken = location.includes("reset-password/") 
    ? location.split("reset-password/")[1] 
    : "";
  
  // Bu kısmı kaldırıyoruz çünkü yukarıda zaten URL parametresini kontrol ediyoruz
  
  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Giriş yapmadan önce yeni bir CSRF token alalım
      const tokenRes = await fetch('/api/csrf-token', { 
        credentials: 'include',
        cache: 'no-store' // Önbelleğe alma
      });
      
      if (!tokenRes.ok) {
        throw new Error('CSRF token alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
      
      const tokenData = await tokenRes.json();
      
      if (tokenData && tokenData.csrfToken) {
        // Token'ı tanımlayalım
        setCsrfToken(tokenData.csrfToken);
        console.log('Login için CSRF token alındı');
        
        // Sonra mutasyonu çalıştıralım
        loginMutation.mutate(loginData);
      } else {
        toast({
          title: "Giriş yapılamadı",
          description: "Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyin.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Giriş yapılamadı",
        description: error.message || "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  };
  
  // Handle registration form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      toast({
        title: "Şartlar ve koşullar",
        description: "Kayıt olmak için şartlar ve koşulları kabul etmelisiniz.",
        variant: "destructive"
      });
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Şifreler eşleşmiyor",
        description: "Girdiğiniz şifreler birbiriyle eşleşmiyor.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Kayıt yapmadan önce CSRF token alalım
      const tokenRes = await fetch('/api/csrf-token', { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!tokenRes.ok) {
        throw new Error('CSRF token alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
      
      const tokenData = await tokenRes.json();
      
      if (tokenData && tokenData.csrfToken) {
        setCsrfToken(tokenData.csrfToken);
        
        // Kayıt işlemini gerçekleştir
        registerMutation.mutate(registerData);
      }
    } catch (error: any) {
      toast({
        title: "Kayıt işlemi başarısız",
        description: error.message || "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  };
  
  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }
  
  // Handle forgot password form submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // CSRF token alalım
      const tokenRes = await fetch('/api/csrf-token', { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!tokenRes.ok) {
        throw new Error('CSRF token alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
      
      const tokenData = await tokenRes.json();
      
      if (tokenData && tokenData.csrfToken) {
        setCsrfToken(tokenData.csrfToken);
        
        // Şifre sıfırlama isteği gönder
        forgotPasswordMutation.mutate({ email: forgotPasswordEmail });
        setForgotPasswordOpen(false);
      }
    } catch (error: any) {
      toast({
        title: "İşlem başarısız",
        description: error.message || "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  };
  
  // Handle reset password form submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast({
        title: "Şifreler eşleşmiyor",
        description: "Girdiğiniz şifreler birbiriyle eşleşmiyor.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // CSRF token alalım
      const tokenRes = await fetch('/api/csrf-token', { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!tokenRes.ok) {
        throw new Error('CSRF token alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
      
      const tokenData = await tokenRes.json();
      
      if (tokenData && tokenData.csrfToken) {
        setCsrfToken(tokenData.csrfToken);
        
        // Şifre sıfırlama isteği gönder
        resetPasswordMutation.mutate({
          token: resetToken,
          newPassword: resetPasswordData.newPassword
        });
      }
    } catch (error: any) {
      toast({
        title: "İşlem başarısız",
        description: error.message || "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Şifremi unuttum diyaloğu */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleForgotPassword}>
            <DialogHeader>
              <DialogTitle>Şifremi Unuttum</DialogTitle>
              <DialogDescription>
                Şifrenizi sıfırlamak için e-posta adresinizi girin. Size şifre sıfırlama bağlantısı göndereceğiz.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-posta</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={forgotPasswordMutation.isPending}>
                {forgotPasswordMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gönderiliyor...</>
                ) : (
                  "Sıfırlama Bağlantısı Gönder"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Şifre sıfırlama diyaloğu */}
      <Dialog open={!!resetToken} onOpenChange={(open) => !open && setLocation("/auth")}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Şifre Sıfırlama</DialogTitle>
              <DialogDescription>
                Lütfen yeni şifrenizi girin.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Yeni Şifre</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Şifre Tekrar</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  required
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({...resetPasswordData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Şifre Sıfırlanıyor...</>
                ) : (
                  "Şifremi Sıfırla"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Left column - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <FaExchangeAlt className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">ebupay</h1>
            </div>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Giriş Yap</TabsTrigger>
              <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <form onSubmit={handleLogin}>
                  <CardHeader>
                    <CardTitle className="text-xl">Giriş Yap</CardTitle>
                    <CardDescription>
                      Hesabınıza giriş yaparak PayPal bakiyenizi Türk Lirasına çevirebilirsiniz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Kullanıcı Adı</Label>
                      <Input 
                        id="username" 
                        required 
                        value={loginData.username} 
                        onChange={e => setLoginData({...loginData, username: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="password">Şifre</Label>
                        <button 
                          type="button"
                          onClick={() => setForgotPasswordOpen(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Şifremi Unuttum
                        </button>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        required 
                        value={loginData.password} 
                        onChange={e => setLoginData({...loginData, password: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <label
                        htmlFor="remember"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Beni hatırla
                      </label>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Giriş Yapılıyor...</>
                      ) : (
                        "Giriş Yap"
                      )}
                    </Button>
                    <div className="w-full text-center pt-4">
                      <a 
                        href="/forgot-password" 
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setLocation("/forgot-password");
                        }}
                      >
                        Şifremi unuttum
                      </a>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <form onSubmit={handleRegister}>
                  <CardHeader>
                    <CardTitle className="text-xl">Hesap Oluştur</CardTitle>
                    <CardDescription>
                      Yeni bir hesap oluşturarak PayPal bakiyenizi Türk Lirasına çevirmeye başlayın.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Ad</Label>
                        <Input 
                          id="firstName" 
                          required 
                          value={registerData.firstName} 
                          onChange={e => setRegisterData({...registerData, firstName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Soyad</Label>
                        <Input 
                          id="lastName" 
                          required 
                          value={registerData.lastName} 
                          onChange={e => setRegisterData({...registerData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Kullanıcı Adı</Label>
                      <Input 
                        id="register-username" 
                        required 
                        value={registerData.username} 
                        onChange={e => setRegisterData({...registerData, username: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-posta</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        value={registerData.email} 
                        onChange={e => setRegisterData({...registerData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon Numarası</Label>
                      <Input 
                        id="phone" 
                        required 
                        value={registerData.phone} 
                        onChange={e => setRegisterData({...registerData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idNumber">TC Kimlik Numarası</Label>
                      <Input 
                        id="idNumber" 
                        required 
                        value={registerData.idNumber} 
                        onChange={e => setRegisterData({...registerData, idNumber: e.target.value})}
                        minLength={11}
                        maxLength={11}
                        placeholder="11 haneli TC kimlik numaranızı girin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Doğum Tarihi</Label>
                      <Input 
                        id="birthDate" 
                        required 
                        value={registerData.birthDate} 
                        onChange={e => setRegisterData({...registerData, birthDate: e.target.value})}
                        placeholder="GG/AA/YYYY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Şifre</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        required 
                        value={registerData.password} 
                        onChange={e => setRegisterData({...registerData, password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        required 
                        value={registerData.confirmPassword} 
                        onChange={e => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={acceptTerms}
                        onCheckedChange={checked => setAcceptTerms(checked === true)}
                      />
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        <a href="#" className="text-primary hover:underline">Şartlar ve koşulları</a> kabul ediyorum
                      </label>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kayıt Yapılıyor...</>
                      ) : (
                        "Hesap Oluştur"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right column - Hero section */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-md text-white">
          <div className="mb-8 flex items-center space-x-3">
            <FaExchangeAlt className="h-10 w-10" />
            <h1 className="text-4xl font-bold">ebupay</h1>
          </div>
          
          <h2 className="text-3xl font-bold mb-4">PayPal Bakiyenizi Türk Lirasına Dönüştürün</h2>
          
          <p className="text-lg mb-8">
            Güvenli ve hızlı bir şekilde PayPal bakiyenizi Türk Lirasına çevirin, 
            dijital cüzdanınızda saklayın veya banka hesabınıza aktarın.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-white bg-opacity-20 p-3">
                <FaExchangeAlt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Kolay Dönüşüm</h3>
                <p className="text-white text-opacity-80">Birkaç tıklama ile PayPal bakiyenizi TL'ye dönüştürün</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-white bg-opacity-20 p-3">
                <FaWallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Dijital Cüzdan</h3>
                <p className="text-white text-opacity-80">Paranızı güvenli dijital cüzdanınızda saklayın</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-white bg-opacity-20 p-3">
                <FaHistory className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">İşlem Geçmişi</h3>
                <p className="text-white text-opacity-80">Tüm işlemlerinizi kolayca takip edin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
