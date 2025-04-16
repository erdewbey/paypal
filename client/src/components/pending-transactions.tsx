import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Transaction {
  id: number;
  transactionId: string;
  type: string;
  sourceAmount: string;
  sourceCurrency: string;
  targetAmount: string;
  targetCurrency: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  paymentDetails?: string;
  paymentScreenshot?: string;
}

interface PendingTransactionsProps {
  transactions: Transaction[];
}

export default function PendingTransactions({ transactions }: PendingTransactionsProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  
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
      setCurrentTransaction(null);
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
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPaymentScreenshot(e.target.files[0]);
    }
  };
  
  // Handle upload submission
  const handleUploadSubmit = () => {
    if (!paymentScreenshot || !currentTransaction) return;
    
    uploadProofMutation.mutate({
      id: currentTransaction.id,
      file: paymentScreenshot
    });
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  // Handle upload payment proof
  const handleUploadProof = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setShowUploadDialog(true);
  };
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 bg-gray-50">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Bekleyen İşlemler
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Onay bekleyen veya devam eden işlemleriniz.
        </p>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="sm:flex sm:justify-between sm:items-baseline">
              <div>
                <h4 className="text-base font-medium text-gray-900">
                  {transaction.type === "conversion" ? "PayPal Dönüşümü" : "Para Çekme"} #{transaction.transactionId}
                </h4>
                <p className="mt-1 text-sm text-gray-500">Oluşturulma: {formatDate(transaction.createdAt)}</p>
              </div>
              <div className="mt-2 sm:mt-0">
                {transaction.status === "pending" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Ödeme Bekleniyor
                  </span>
                )}
                {transaction.status === "processing" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    İnceleniyor
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="sm:grid sm:grid-cols-2 sm:gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Miktar</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {transaction.type === "conversion" 
                      ? `$${parseFloat(transaction.sourceAmount).toLocaleString("tr-TR")} → ${parseFloat(transaction.targetAmount).toLocaleString("tr-TR")} ₺`
                      : `${parseFloat(transaction.sourceAmount).toLocaleString("tr-TR")} ₺`}
                  </p>
                </div>
                {transaction.type === "conversion" && (
                  <div className="mt-3 sm:mt-0">
                    <p className="text-sm font-medium text-gray-500">PayPal Gönderim Bilgileri</p>
                    <p className="mt-1 text-sm text-gray-900">{paypalEmail}</p>
                  </div>
                )}
                {transaction.type === "withdrawal" && transaction.paymentMethod && (
                  <div className="mt-3 sm:mt-0">
                    <p className="text-sm font-medium text-gray-500">Ödeme Yöntemi</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {transaction.paymentMethod === "bank" ? "Banka Havalesi" : "Kripto Para"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {transaction.type === "conversion" && transaction.status === "pending" && !transaction.paymentScreenshot && (
              <>
                <div className="mt-4">
                  <div className="rounded-md bg-blue-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Lütfen belirtilen PayPal adresine ${parseFloat(transaction.sourceAmount).toLocaleString("tr-TR")} gönderin ve ödeme yaptıktan sonra aşağıdaki butona tıklayın.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <Button 
                    onClick={() => handleUploadProof(transaction)}
                    className="flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ödemeyi Yaptım
                  </Button>
                </div>
              </>
            )}
            
            {transaction.type === "conversion" && transaction.status === "processing" && (
              <div className="mt-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Ödemeniz inceleniyor. İşleminiz onaylandığında bakiyenize yansıtılacaktır.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {transaction.type === "withdrawal" && (
              <div className="mt-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Para çekme talebiniz inceleniyor. Tahmini işlem süresi 1-2 iş günüdür.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {transactions.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            Bekleyen işleminiz bulunmamaktadır.
          </div>
        )}
      </div>
      
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
                Lütfen {currentTransaction ? `$${parseFloat(currentTransaction.sourceAmount).toLocaleString("tr-TR")}` : ""} tutarını <strong>{paypalEmail}</strong> PayPal adresine gönderin ve ödeme ekran görüntüsünü yükleyin.
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
  );
}
