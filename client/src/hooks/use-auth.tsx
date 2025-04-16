import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setCsrfToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  forgotPasswordMutation: UseMutationResult<{message: string}, Error, {email: string}>;
  resetPasswordMutation: UseMutationResult<{message: string}, Error, {token: string, newPassword: string}>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  idNumber: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Sayfa yüklendiğinde CSRF token al
  useEffect(() => {
    // Sayfaya ilk girişte bir CSRF token alalım
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch('/api/csrf-token', { 
          credentials: 'include',
          cache: 'no-store' // Önbelleğe alma
        });
        
        if (!res.ok) {
          throw new Error('CSRF token alınamadı');
        }
        
        const data = await res.json();
        
        // Token başarıyla alındı, setCsrfToken fonksiyonuyla saklayalım
        if (data && data.csrfToken) {
          setCsrfToken(data.csrfToken);
          console.log('CSRF token alındı');
        }
      } catch (err) {
        console.error('CSRF token alma hatası:', err);
        // 3 saniye sonra tekrar deneyelim
        setTimeout(fetchCsrfToken, 3000);
      }
    };
    
    fetchCsrfToken();
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Giriş başarılı",
        description: `Hoş geldiniz, ${user.firstName}!`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Giriş başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Kayıt başarılı",
        description: data.message || "Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.",
      });
      // Kullanıcı bilgilerini temizleyip e-posta doğrulama bekleniyor sayfasına yönlendir
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.setQueryData(["/api/user"], null);
      // E-mail adresini kullan veya kayıt verilerindeki email'i al
      const email = data.email || (data as any).user?.email;
      setTimeout(() => {
        setLocation(`/verification-pending?email=${encodeURIComponent(email || "")}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Kayıt başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Çıkış yapıldı",
        description: "Başarıyla çıkış yaptınız.",
      });
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Çıkış başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Şifremi unuttum mutasyonu
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: {email: string}) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return await res.json();
    },
    onSuccess: (data: {message: string}) => {
      toast({
        title: "Şifre sıfırlama e-postası gönderildi",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Şifre sıfırlama isteği başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Şifre sıfırlama mutasyonu
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: {token: string, newPassword: string}) => {
      // API password ve confirmPassword parametrelerini bekliyor
      const payload = {
        token: data.token,
        password: data.newPassword,
        confirmPassword: data.newPassword
      };
      const res = await apiRequest("POST", "/api/reset-password", payload);
      return await res.json();
    },
    onSuccess: (data: {message: string}) => {
      toast({
        title: "Şifre sıfırlama başarılı",
        description: data.message,
      });
      // Şifre sıfırlama başarılı olduğunda ana sayfaya yönlendir
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Şifre sıfırlama başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
        resetPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
