import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, PlusCircle, Edit, Save, Trash, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import { ExchangeRate } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function AdminRates() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [rateForm, setRateForm] = useState({
    currencyPair: "USD_TRY",
    rate: "",
    commissionRate: ""
  });
  
  // Fetch exchange rates
  const { data: exchangeRates, isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
    queryFn: getQueryFn({ on401: "throw" }),
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kurlar yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create or update rate mutation
  const rateUpdateMutation = useMutation({
    mutationFn: async (data: typeof rateForm) => {
      const res = await apiRequest("POST", "/api/exchange-rates", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      setIsRateDialogOpen(false);
      setCurrentRate(null);
      toast({
        title: "Başarılı",
        description: "Kur başarıyla güncellendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Kur güncellenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddRate = () => {
    setCurrentRate(null);
    setRateForm({
      currencyPair: "USD_TRY",
      rate: "",
      commissionRate: ""
    });
    setIsRateDialogOpen(true);
  };
  
  const handleEditRate = (rate: ExchangeRate) => {
    setCurrentRate(rate);
    setRateForm({
      currencyPair: rate.currencyPair,
      rate: rate.rate,
      commissionRate: rate.commissionRate
    });
    setIsRateDialogOpen(true);
  };
  
  const handleSubmitRate = () => {
    // Validate form
    if (!rateForm.rate || !rateForm.commissionRate) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert to numbers and validate
    const rateValue = parseFloat(rateForm.rate);
    const commissionValue = parseFloat(rateForm.commissionRate);
    
    if (isNaN(rateValue) || rateValue <= 0) {
      toast({
        title: "Hata",
        description: "Kur oranı geçerli ve pozitif bir sayı olmalıdır.",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 1) {
      toast({
        title: "Hata",
        description: "Komisyon oranı 0 ile 1 arasında olmalıdır.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit form
    rateUpdateMutation.mutate(rateForm);
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMM yyyy, HH:mm", { locale: tr });
    } catch (e) {
      return dateString;
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
            activePage="admin-rates"
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
          activePage="admin-rates"
        />
        
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Kur Yönetimi</h1>
              
              <Button onClick={handleAddRate} className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                Yeni Kur Ekle
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exchangeRates?.map((rate) => (
                <Card key={rate.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl">{rate.currencyPair}</CardTitle>
                        <CardDescription>
                          Son Güncelleme: {formatDate(rate.updatedAt)}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditRate(rate)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-500">Kur Oranı</Label>
                        <div className="text-2xl font-bold mt-1 flex items-center">
                          <DollarSign className="h-5 w-5 mr-1 text-green-600" />
                          1 = ₺{parseFloat(rate.rate).toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-gray-500">Komisyon Oranı</Label>
                        <div className="text-lg font-medium mt-1">
                          %{(parseFloat(rate.commissionRate) * 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {exchangeRates?.length === 0 && (
                <div className="col-span-full bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500 mb-4">Henüz kur bilgisi eklenmemiş.</p>
                  <Button onClick={handleAddRate} className="flex items-center gap-1 mx-auto">
                    <PlusCircle className="h-4 w-4" />
                    Yeni Kur Ekle
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      
      {/* Exchange Rate Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentRate ? "Kur Oranını Düzenle" : "Yeni Kur Oranı Ekle"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currencyPair">Para Birimi Çifti</Label>
              <Input
                id="currencyPair"
                value={rateForm.currencyPair}
                onChange={(e) => setRateForm({ ...rateForm, currencyPair: e.target.value })}
                disabled={!!currentRate} // Only allow editing if creating new rate
                placeholder="Örn: USD_TRY"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate">Kur Oranı</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={rateForm.rate}
                onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                placeholder="Örn: 35.42"
              />
              <p className="text-sm text-gray-500">1 birim kaynak para birimi kaç birim hedef para birimine eşit</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Komisyon Oranı</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="1"
                step="0.0001"
                value={rateForm.commissionRate}
                onChange={(e) => setRateForm({ ...rateForm, commissionRate: e.target.value })}
                placeholder="Örn: 0.025 (% cinsinden değil, 0-1 arası)"
              />
              <p className="text-sm text-gray-500">0 ile 1 arasında, ör: 0.025 = %2.5</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSubmitRate} 
              disabled={rateUpdateMutation.isPending}
              className="flex items-center gap-1"
            >
              {rateUpdateMutation.isPending ? (
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