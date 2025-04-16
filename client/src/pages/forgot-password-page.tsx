import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { FaExchangeAlt } from "react-icons/fa";
import { setCsrfToken } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form şeması
const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

export default function ForgotPasswordPage() {
  const { forgotPasswordMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // React Hook Form
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
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
        forgotPasswordMutation.mutate({ email: values.email });
      }
    } catch (error: any) {
      toast({
        title: "İşlem başarısız",
        description: error.message || "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <FaExchangeAlt className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">ebupay</h1>
          </div>
        </div>
        
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setLocation("/auth")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>Şifremi Unuttum</CardTitle>
                </div>
                <CardDescription>
                  Şifrenizi sıfırlamak için e-posta adresinizi girin. Size şifre sıfırlama bağlantısı göndereceğiz.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input placeholder="ornek@mail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gönderiliyor...</>
                  ) : (
                    "Sıfırlama Bağlantısı Gönder"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}