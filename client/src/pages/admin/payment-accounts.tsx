import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CirclePlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Define the account types
const accountTypes = [
  { value: "paypal", label: "PayPal" },
  { value: "bank", label: "Banka Hesabı" },
  { value: "crypto", label: "Kripto Cüzdanı" }
];

// Account type schema
const paymentAccountSchema = z.object({
  accountType: z.string().min(1, "Hesap tipi seçilmelidir"),
  accountName: z.string().min(1, "Hesap adı gereklidir"),
  accountNumber: z.string().min(1, "Hesap numarası/email gereklidir"),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
  branchCode: z.string().optional(),
  additionalInfo: z.string().optional(),
  isActive: z.boolean().default(true)
});

type PaymentAccountFormValues = z.infer<typeof paymentAccountSchema>;

// Define the PaymentAccount type
interface PaymentAccount {
  id: number;
  accountType: string;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  iban: string | null;
  swiftCode: string | null;
  branchCode: string | null;
  additionalInfo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Account Form Component
const AccountForm = ({ 
  account, 
  onSubmit, 
  onCancel 
}: { 
  account?: PaymentAccount; 
  onSubmit: (data: PaymentAccountFormValues) => void; 
  onCancel: () => void;
}) => {
  const form = useForm<PaymentAccountFormValues>({
    resolver: zodResolver(paymentAccountSchema),
    defaultValues: account ? {
      accountType: account.accountType,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName || "",
      iban: account.iban || "",
      swiftCode: account.swiftCode || "",
      branchCode: account.branchCode || "",
      additionalInfo: account.additionalInfo || "",
      isActive: account.isActive
    } : {
      accountType: "",
      accountName: "",
      accountNumber: "",
      bankName: "",
      iban: "",
      swiftCode: "",
      branchCode: "",
      additionalInfo: "",
      isActive: true
    }
  });
  
  const accountType = form.watch("accountType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hesap Tipi</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Hesap tipi seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="accountName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hesap Adı</FormLabel>
              <FormControl>
                <Input
                  placeholder={accountType === "paypal" ? "Ana PayPal Hesabı" : "Ana Banka Hesabı"}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Bu hesap için tanımlayıcı bir isim
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {accountType === "paypal" 
                  ? "PayPal Email Adresi" 
                  : accountType === "crypto" 
                    ? "Cüzdan Adresi" 
                    : "Hesap Numarası"}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={accountType === "paypal" 
                    ? "ornek@sirket.com" 
                    : accountType === "crypto" 
                      ? "0x123..." 
                      : "123456789"}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {accountType === "bank" && (
          <>
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banka Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="İş Bankası" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input placeholder="TR12 3456 7890 1234 5678 9012 34" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="swiftCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT Kodu</FormLabel>
                    <FormControl>
                      <Input placeholder="TRISXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="branchCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube Kodu</FormLabel>
                    <FormControl>
                      <Input placeholder="1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        
        <FormField
          control={form.control}
          name="additionalInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ek Bilgiler</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Kullanıcılar için ekstra bilgiler veya talimatlar"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Aktif Hesap</FormLabel>
                <FormDescription>
                  Bu hesabı kullanıcılara göster ve işlemlerde kullan
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            İptal
          </Button>
          <Button type="submit">
            {account ? "Güncelle" : "Ekle"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function AdminPaymentAccounts() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch all payment accounts
  const { data: accounts, isLoading } = useQuery<PaymentAccount[]>({
    queryKey: ["/api/admin/payment-accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Create payment account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: PaymentAccountFormValues) => {
      const res = await apiRequest("POST", "/api/admin/payment-accounts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-accounts/active"] });
      setIsAddAccountDialogOpen(false);
      toast({
        title: "Başarılı",
        description: "Ödeme hesabı başarıyla eklendi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Ödeme hesabı eklenirken bir hata oluştu: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
  // Update payment account mutation
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PaymentAccountFormValues }) => {
      const res = await apiRequest("PATCH", `/api/admin/payment-accounts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-accounts/active"] });
      setIsEditAccountDialogOpen(false);
      setSelectedAccount(null);
      toast({
        title: "Başarılı",
        description: "Ödeme hesabı başarıyla güncellendi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Ödeme hesabı güncellenirken bir hata oluştu: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
  // Delete payment account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/payment-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-accounts/active"] });
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
      toast({
        title: "Başarılı",
        description: "Ödeme hesabı başarıyla silindi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Ödeme hesabı silinirken bir hata oluştu: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
  // Handle account creation
  const handleCreateAccount = (data: PaymentAccountFormValues) => {
    createAccountMutation.mutate(data);
  };
  
  // Handle account update
  const handleUpdateAccount = (data: PaymentAccountFormValues) => {
    if (selectedAccount) {
      updateAccountMutation.mutate({ id: selectedAccount.id, data });
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = () => {
    if (selectedAccount) {
      deleteAccountMutation.mutate(selectedAccount.id);
    }
  };
  
  // Filter accounts by search term
  const filteredAccounts = accounts?.filter(account => {
    const searchLower = search.toLowerCase();
    return (
      account.accountName.toLowerCase().includes(searchLower) ||
      account.accountNumber.toLowerCase().includes(searchLower) ||
      (account.bankName && account.bankName.toLowerCase().includes(searchLower))
    );
  }) || [];
  
  // Get account type label
  const getAccountTypeLabel = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type);
    return accountType?.label || type;
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        <Sidebar
          isMobile={isMobile}
          showMobileSidebar={showMobileSidebar}
          onCloseMobileSidebar={() => setShowMobileSidebar(false)}
          activePage="admin-payment-accounts"
        />
        
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Ödeme Hesapları Yönetimi</h1>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Input
                  placeholder="Hesap ara..."
                  className="w-full sm:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                
                <Dialog 
                  open={isAddAccountDialogOpen}
                  onOpenChange={setIsAddAccountDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <CirclePlus className="h-4 w-4 mr-2" />
                      Yeni Hesap Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Yeni Ödeme Hesabı Ekle</DialogTitle>
                      <DialogDescription>
                        Sistem için yeni bir ödeme hesabı ekleyin. Bu hesap kullanıcılara gösterilecek.
                      </DialogDescription>
                    </DialogHeader>
                    <AccountForm 
                      onSubmit={handleCreateAccount}
                      onCancel={() => setIsAddAccountDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                {accounts && accounts.length > 0 ? (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Hesap Türü</TableHead>
                          <TableHead>Hesap Adı</TableHead>
                          <TableHead>Hesap No / Email</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>{account.id}</TableCell>
                            <TableCell>
                              {getAccountTypeLabel(account.accountType)}
                            </TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell>{account.accountNumber}</TableCell>
                            <TableCell>
                              {account.isActive ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Aktif</Badge>
                              ) : (
                                <Badge variant="secondary">Pasif</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Menü aç</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Dialog 
                                    open={isEditAccountDialogOpen && selectedAccount?.id === account.id}
                                    onOpenChange={(open) => {
                                      setIsEditAccountDialogOpen(open);
                                      if (!open) setSelectedAccount(null);
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setSelectedAccount(account);
                                          setIsEditAccountDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Düzenle
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[550px]">
                                      <DialogHeader>
                                        <DialogTitle>Ödeme Hesabını Düzenle</DialogTitle>
                                        <DialogDescription>
                                          Ödeme hesap bilgilerini güncelleyin.
                                        </DialogDescription>
                                      </DialogHeader>
                                      {selectedAccount && (
                                        <AccountForm 
                                          account={selectedAccount}
                                          onSubmit={handleUpdateAccount}
                                          onCancel={() => {
                                            setIsEditAccountDialogOpen(false);
                                            setSelectedAccount(null);
                                          }}
                                        />
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                  
                                  <Dialog 
                                    open={isDeleteDialogOpen && selectedAccount?.id === account.id}
                                    onOpenChange={(open) => {
                                      setIsDeleteDialogOpen(open);
                                      if (!open) setSelectedAccount(null);
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setSelectedAccount(account);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Sil
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Hesabı Sil</DialogTitle>
                                        <DialogDescription>
                                          Bu ödeme hesabını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => {
                                            setIsDeleteDialogOpen(false);
                                            setSelectedAccount(null);
                                          }}
                                        >
                                          İptal
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          onClick={handleDeleteAccount}
                                        >
                                          Hesabı Sil
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Henüz ödeme hesabı bulunmuyor</CardTitle>
                      <CardDescription>
                        Kullanıcıların dönüşüm işlemleri için yeni bir ödeme hesabı ekleyin.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => setIsAddAccountDialogOpen(true)}>
                        <CirclePlus className="h-4 w-4 mr-2" />
                        Yeni Hesap Ekle
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}