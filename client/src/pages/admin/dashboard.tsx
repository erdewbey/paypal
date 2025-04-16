import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, CreditCard, DollarSign, Wallet, ArrowUp, ArrowDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";
import { Transaction, User, ExchangeRate } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
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

  // Fetch all transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "İşlem bilgileri yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch exchange rates
  const { data: exchangeRates, isLoading: ratesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
    queryFn: getQueryFn({ on401: "throw" }),
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kur bilgileri yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = usersLoading || transactionsLoading || ratesLoading;
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <Sidebar
            isMobile={isMobile}
            showMobileSidebar={showMobileSidebar}
            onCloseMobileSidebar={() => setShowMobileSidebar(false)}
            activePage="admin-dashboard"
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

  // Calculate stats
  const totalUsers = users?.length || 0;
  const pendingTransactions = transactions?.filter(t => t.status === "pending").length || 0;
  const totalTransactions = transactions?.length || 0;
  const totalUsdVolume = transactions?.reduce((sum, t) => {
    if (t.status === "completed" && t.sourceCurrency === "USD") {
      return sum + parseFloat(t.sourceAmount);
    }
    return sum;
  }, 0) || 0;

  // Chart data
  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const transactionsByDay = last7Days.map(date => {
    const count = transactions?.filter(t => t.createdAt.split('T')[0] === date).length || 0;
    return {
      date: date.split('-').slice(1).join('/'), // Format as MM/DD
      count,
    };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Sidebar
          isMobile={isMobile}
          showMobileSidebar={showMobileSidebar}
          onCloseMobileSidebar={() => setShowMobileSidebar(false)}
          activePage="admin-dashboard"
        />
        
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Admin Kontrol Paneli</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
                  <Users className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers}</div>
                  <p className="text-xs text-gray-500">Tüm kayıtlı kullanıcılar</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Bekleyen İşlemler</CardTitle>
                  <CreditCard className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTransactions}</div>
                  <p className="text-xs text-gray-500">Onay bekleyen işlemler</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Toplam İşlemler</CardTitle>
                  <Wallet className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTransactions}</div>
                  <p className="text-xs text-gray-500">Tüm zamanlar</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Toplam USD Hacmi</CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalUsdVolume.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">Tamamlanan işlemler</p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="activity">
              <TabsList className="mb-4">
                <TabsTrigger value="activity">İşlem Aktivitesi</TabsTrigger>
                <TabsTrigger value="rates">Kurlar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Son 7 Gündeki İşlemler</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transactionsByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" name="İşlem Sayısı" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="rates">
                <Card>
                  <CardHeader>
                    <CardTitle>Güncel Kur Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {exchangeRates?.map((rate) => (
                        <div key={rate.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{rate.currencyPair}</div>
                            <div className="text-xs text-gray-500">
                              Komisyon: %{(parseFloat(rate.commissionRate) * 100).toFixed(2)}
                            </div>
                          </div>
                          <div className="text-lg font-bold">{parseFloat(rate.rate).toFixed(2)}</div>
                        </div>
                      ))}
                      
                      {exchangeRates?.length === 0 && (
                        <p className="text-center text-gray-500">Kur bilgisi bulunamadı.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}