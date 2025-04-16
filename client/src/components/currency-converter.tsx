import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

interface CurrencyConverterProps {
  exchangeRate?: any;
  fullPage?: boolean;
}

export default function CurrencyConverter({ exchangeRate, fullPage = false }: CurrencyConverterProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch active payment accounts
  const { data: paymentAccounts } = useQuery({
    queryKey: ['/api/payment-accounts/active'],
    refetchOnWindowFocus: false
  });
  
  // Get PayPal account from payment accounts
  const paypalAccount = paymentAccounts?.find((account: any) => 
    account.accountType === 'paypal' && account.isActive
  );
  
  // PayPal email address (from database or fallback)
  const paypalEmail = paypalAccount?.accountNumber || "payments@tryexchange.com";
  
  // Form state
  const [amount, setAmount] = useState<string>("100");
  const [receiveAmount, setReceiveAmount] = useState<string>("0");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);
  
  // Calculate values based on exchange rate
  useEffect(() => {
    if (exchangeRate && amount) {
      const parsedAmount = parseFloat(amount);
      if (!isNaN(parsedAmount)) {
        const rate = parseFloat(exchangeRate.rate);
        const commissionRate = parseFloat(exchangeRate.commissionRate);
        
        const totalValue = parsedAmount * rate;
        const commissionAmount = totalValue * commissionRate;
        const netAmount = totalValue - commissionAmount;
        
        setReceiveAmount(netAmount.toFixed(2));
      } else {
        setReceiveAmount("0");
      }
    }
  }, [exchangeRate, amount]);
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setCurrentTransactionId(data.id);
      setShowConfirmation(false);
      setShowUploadDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "İşlem başarısız",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Upload payment proof mutation
  const uploadProofMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number, file: File }) => {
      // Önce CSRF token alalım
      const tokenRes = await fetch('/api/csrf-token', { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!tokenRes.ok) {
        throw new Error('CSRF token alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      }
      
      const tokenData = await tokenRes.json();
      const csrfToken = tokenData.csrfToken;
      
      const formData = new FormData();
      formData.append("screenshot", file);
      
      const res = await fetch(`/api/transactions/${id}/payment-proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          'X-CSRF-Token': csrfToken
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
        title: "Ödeme kanıtı yüklendi",
        description: "İşleminiz onay bekliyor. Durumunu 'Bekleyen İşlemler' kısmından takip edebilirsiniz."
      });
      setShowUploadDialog(false);
      setPaymentScreenshot(null);
      setCurrentTransactionId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Yükleme başarısız",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Geçersiz miktar",
        description: "Lütfen geçerli bir miktar girin.",
        variant: "destructive"
      });
      return;
    }
    
    setShowConfirmation(true);
  };
  
  // Handle confirmation
  const handleConfirm = () => {
    if (!exchangeRate) return;
    
    const parsedAmount = parseFloat(amount);
    const rate = parseFloat(exchangeRate.rate);
    const commissionRate = parseFloat(exchangeRate.commissionRate);
    
    const totalValue = parsedAmount * rate;
    const commissionAmount = totalValue * commissionRate;
    const netAmount = totalValue - commissionAmount;
    
    createTransactionMutation.mutate({
      type: "conversion",
      sourceAmount: parsedAmount.toString(),
      sourceCurrency: "USD",
      targetAmount: netAmount.toString(),
      targetCurrency: "TRY",
      rate: rate.toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: commissionAmount.toString(),
      status: "pending"
    });
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPaymentScreenshot(e.target.files[0]);
    }
  };
  
  // Handle upload submission
  const handleUploadSubmit = () => {
    if (!paymentScreenshot || !currentTransactionId) return;
    
    uploadProofMutation.mutate({
      id: currentTransactionId,
      file: paymentScreenshot
    });
  };
  
  // Calculate summary values
  const parsedAmount = parseFloat(amount) || 0;
  const rate = exchangeRate ? parseFloat(exchangeRate.rate) : 0;
  const commissionRate = exchangeRate ? parseFloat(exchangeRate.commissionRate) * 100 : 0;
  const totalValue = parsedAmount * rate;
  const commissionAmount = totalValue * (commissionRate / 100);
  const netAmount = totalValue - commissionAmount;
  
  return (
    <div className={fullPage ? "" : "bg-white shadow rounded-lg overflow-hidden"}>
      {!fullPage && (
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <RefreshCwIcon className="h-5 w-5 mr-2 text-primary-600" />
            Para Dönüştürme
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            PayPal bakiyenizi Türk Lirasına dönüştürün.
          </p>
        </div>
      )}
      
      <div className="px-4 py-5 sm:p-6">
        <form id="currency-converter-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="amount">Miktar</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <Input
                  type="text"
                  id="amount"
                  name="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">PayPal'dan çekmek istediğiniz miktar (USD)</p>
            </div>

            <div>
              <Label htmlFor="receive">Alacağınız Miktar</Label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₺</span>
                </div>
                <Input
                  type="text"
                  id="receive"
                  name="receive"
                  value={parseFloat(receiveAmount).toLocaleString('tr-TR')}
                  readOnly
                  className="bg-gray-50 pl-8"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Komisyon düşüldükten sonraki net tutar</p>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-500">Döviz Kuru:</span>
              <span className="font-medium text-gray-900">
                1 $ = {rate.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="font-medium text-gray-500">Toplam Değer:</span>
              <span className="font-medium text-gray-900">
                {totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="font-medium text-gray-500">Komisyon ({commissionRate.toFixed(2)}%):</span>
              <span className="font-medium text-gray-900">
                {commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2 border-t border-gray-200 pt-2">
              <span className="font-medium text-gray-700">Net Alacağınız:</span>
              <span className="font-medium text-primary-600">
                {netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              type="submit" 
              className="w-full py-3"
              disabled={!exchangeRate || createTransactionMutation.isPending}
            >
              {createTransactionMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İşleniyor...</>
              ) : (
                "Dönüşümü Başlat"
              )}
            </Button>
          </div>
        </form>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>İşlemi Onaylayın</DialogTitle>
              <DialogDescription>
                Aşağıdaki detayları kontrol edin ve PayPal'dan TL'ye dönüşüm işlemini başlatın.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gönderilecek:</span>
                  <span className="font-semibold">${parsedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Alınacak:</span>
                  <span className="font-semibold">{netAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kur:</span>
                  <span>1$ = {rate.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Komisyon:</span>
                  <span>{commissionRate.toFixed(2)}% ({commissionAmount.toLocaleString('tr-TR')} ₺)</span>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>PayPal Ödeme Bilgileri</AlertTitle>
                <AlertDescription>
                  Onay verdiğinizde, ${parsedAmount.toFixed(2)} tutarını PayPal adresimize göndermeniz gerekecek: <strong>{paypalEmail}</strong>
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                İptal
              </Button>
              <Button onClick={handleConfirm}>
                Onayla ve Devam Et
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Payment Proof Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ödeme Kanıtı Yükleyin</DialogTitle>
              <DialogDescription>
                Lütfen PayPal ödemesinin ekran görüntüsünü yükleyin.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ödeme Talimatları</AlertTitle>
                <AlertDescription>
                  Lütfen ${parsedAmount.toFixed(2)} tutarını <strong>{paypalEmail}</strong> PayPal adresine gönderin ve ödeme ekran görüntüsünü yükleyin.
                </AlertDescription>
              </Alert>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <div className="space-y-2">
                    <div className="mx-auto h-12 w-12 text-gray-400 flex items-center justify-center">
                      <Upload size={32} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-primary-600">Dosya yüklemek için tıklayın</span> veya sürükleyip bırakın
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF maksimum 5MB
                    </p>
                  </div>
                </label>
                
                {paymentScreenshot && (
                  <div className="mt-4 text-sm text-gray-900">
                    Seçilen dosya: {paymentScreenshot.name}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Daha Sonra
              </Button>
              <Button 
                onClick={handleUploadSubmit} 
                disabled={!paymentScreenshot || uploadProofMutation.isPending}
              >
                {uploadProofMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</>
                ) : (
                  "Ödemeyi Yaptım ve Kanıtı Yükledim"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Helper icon component
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
