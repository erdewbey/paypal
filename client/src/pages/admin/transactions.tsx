import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Eye, Check, X, Filter, Calendar, CreditCard, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import { Transaction, User } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TransactionDetailsProps = {
  transaction: Transaction;
  users: User[];
  onClose: () => void;
  onUpdateStatus: (status: string, notes?: string) => void;
  isPending: boolean;
};

const TransactionDetails = ({ 
  transaction, 
  users, 
  onClose, 
  onUpdateStatus,
  isPending
}: TransactionDetailsProps) => {
  const [status, setStatus] = useState(transaction.status);
  const [notes, setNotes] = useState(transaction.adminNotes || "");
  const user = users.find(u => u.id === transaction.userId);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Beklemede</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">İşleniyor</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Tamamlandı</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">İptal Edildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMM yyyy, HH:mm", { locale: tr });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h3 className="text-lg font-semibold">İşlem #{transaction.id}</h3>
        <p className="text-sm text-gray-500">İşlem ID: {transaction.transactionId}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Kullanıcı</h4>
          <p>{user ? `${user.firstName} ${user.lastName} (@${user.username})` : `ID: ${transaction.userId}`}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Tarih</h4>
          <p>{formatDate(transaction.createdAt)}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">İşlem Tipi</h4>
          <p>{transaction.type === "conversion" ? "Dönüşüm" : 
             transaction.type === "withdrawal" ? "Para Çekme" : transaction.type}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Durum</h4>
          <div>{getStatusBadge(transaction.status)}</div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Miktar</h4>
          <p>{transaction.sourceCurrency === "USD" ? "$" : "₺"}{transaction.sourceAmount} → 
             {transaction.targetCurrency === "USD" ? "$" : "₺"}{transaction.targetAmount}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Oran</h4>
          <p>1 {transaction.sourceCurrency} = {transaction.rate} {transaction.targetCurrency}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Komisyon</h4>
          <p>%{(parseFloat(transaction.commissionRate) * 100).toFixed(2)} ({transaction.targetCurrency === "USD" ? "$" : "₺"}{transaction.commissionAmount})</p>
        </div>
        
        {transaction.paymentMethod && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Ödeme Yöntemi</h4>
            <p>{transaction.paymentMethod}</p>
          </div>
        )}
        
        {transaction.paymentDetails && (
          <div className="col-span-2">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Ödeme Detayları</h4>
            <p className="text-sm bg-gray-50 p-2 rounded">{transaction.paymentDetails}</p>
          </div>
        )}
        
        {transaction.paymentScreenshot && (
          <div className="col-span-2">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Ödeme Kanıtı</h4>
            <div className="mt-1">
              <img 
                src={transaction.paymentScreenshot}
                alt="Ödeme Kanıtı" 
                className="max-w-full h-auto max-h-60 rounded-md border border-gray-200 cursor-pointer"
                onClick={() => window.open(transaction.paymentScreenshot, '_blank')}
              />
              <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => window.open(transaction.paymentScreenshot, '_blank')}>
                Tam boyutta görüntülemek için tıklayın
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="space-y-2">
          <Label htmlFor="status">Durum Güncelle</Label>
          <Select 
            value={status} 
            onValueChange={setStatus}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Durum seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="processing">İşleniyor</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
              <SelectItem value="cancelled">İptal Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Admin Notları</Label>
          <Textarea 
            id="notes" 
            placeholder="İşlemle ilgili notlar ekleyin..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      
      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Kapat
        </Button>
        <Button 
          onClick={() => onUpdateStatus(status, notes)}
          disabled={isPending}
          className="flex items-center gap-1"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Durum Güncelle
        </Button>
      </DialogFooter>
    </div>
  );
};

export default function AdminTransactions() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Fetch all transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "İşlemler yüklenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Fetch all users for reference
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
  
  // Update transaction status mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ 
      id, status, notes 
    }: { 
      id: number; 
      status: string; 
      notes?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/transactions/${id}`, { 
        status, 
        adminNotes: notes 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      setSelectedTransaction(null);
      toast({
        title: "Başarılı",
        description: "İşlem durumu güncellendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "İşlem güncellenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };
  
  const handleUpdateStatus = (status: string, notes?: string) => {
    if (selectedTransaction) {
      updateTransactionMutation.mutate({
        id: selectedTransaction.id,
        status,
        notes,
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: tr });
    } catch (e) {
      return dateString;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Beklemede</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">İşleniyor</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Tamamlandı</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">İptal Edildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getUserName = (userId: number) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `ID: ${userId}`;
  };
  
  const isLoading = transactionsLoading || usersLoading;
  
  const filteredTransactions = transactions?.filter(transaction => {
    // Apply type filter
    if (typeFilter !== "all" && transaction.type !== typeFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter !== "all" && transaction.status !== statusFilter) {
      return false;
    }
    
    // Apply search filter
    const searchLower = search.toLowerCase();
    if (searchLower) {
      const user = users?.find(u => u.id === transaction.userId);
      const userName = user ? `${user.firstName} ${user.lastName} ${user.username}`.toLowerCase() : "";
      
      return (
        transaction.transactionId.toLowerCase().includes(searchLower) ||
        transaction.type.toLowerCase().includes(searchLower) ||
        userName.includes(searchLower) ||
        transaction.sourceAmount.includes(searchLower) ||
        transaction.targetAmount.includes(searchLower)
      );
    }
    
    return true;
  }) || [];
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <Sidebar
            isMobile={isMobile}
            showMobileSidebar={showMobileSidebar}
            onCloseMobileSidebar={() => setShowMobileSidebar(false)}
            activePage="admin-transactions"
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
          activePage="admin-transactions"
        />
        
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">İşlem Yönetimi</h1>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder="İşlem ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="İşlem tipi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm İşlemler</SelectItem>
                      <SelectItem value="conversion">Dönüşüm</SelectItem>
                      <SelectItem value="withdrawal">Para Çekme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="processing">İşleniyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="overflow-auto rounded-lg shadow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.id}</TableCell>
                      <TableCell>{getUserName(transaction.userId)}</TableCell>
                      <TableCell>
                        {transaction.type === "conversion" ? "Dönüşüm" : 
                         transaction.type === "withdrawal" ? "Para Çekme" : transaction.type}
                      </TableCell>
                      <TableCell>
                        {transaction.sourceCurrency === "USD" ? "$" : "₺"}{transaction.sourceAmount} → 
                        {transaction.targetCurrency === "USD" ? "$" : "₺"}{transaction.targetAmount}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTransaction(transaction)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Görüntüle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                        {search || typeFilter !== "all" || statusFilter !== "all" 
                          ? "Filtrelere uygun işlem bulunamadı." 
                          : "Henüz işlem kaydı bulunmuyor."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
        </div>
      </div>
      
      {/* Transaction Details Dialog */}
      <Dialog open={selectedTransaction !== null} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>İşlem Detayları</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && users && (
            <TransactionDetails
              transaction={selectedTransaction}
              users={users}
              onClose={() => setSelectedTransaction(null)}
              onUpdateStatus={handleUpdateStatus}
              isPending={updateTransactionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}