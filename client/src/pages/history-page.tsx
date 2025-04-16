import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import TransactionTable from "@/components/transaction-table";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function HistoryPage() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Responsive handling
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Fetch transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });
  
  // Filter transactions
  const filteredTransactions = transactions?.filter(transaction => {
    // Filter by search term
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      transaction.transactionId.toLowerCase().includes(searchLower) || 
      transaction.sourceAmount.toString().includes(searchLower) ||
      transaction.targetAmount.toString().includes(searchLower);
    
    // Filter by status
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    // Filter by type
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

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
        activePage="history"
      />

      {/* Main content */}
      <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
        <div className="py-6">
          {/* Page header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
            <div className="lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mt-10 lg:mt-0">
                  İşlem Geçmişi
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Tüm işlemlerinizin detaylı geçmişini görüntüleyin.
                </p>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">İşlem Ara</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="İşlem ID veya miktar..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status-filter">Durum</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Tüm Durumlar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="pending">Bekliyor</SelectItem>
                      <SelectItem value="processing">İşlemde</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="type-filter">İşlem Türü</Label>
                  <Select
                    value={typeFilter}
                    onValueChange={setTypeFilter}
                  >
                    <SelectTrigger id="type-filter">
                      <SelectValue placeholder="Tüm Türler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Türler</SelectItem>
                      <SelectItem value="conversion">Dönüşüm</SelectItem>
                      <SelectItem value="withdrawal">Para Çekme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Transactions Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  İşlem Geçmişi
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Platformumuzda yaptığınız tüm işlemlerin kaydı.
                </p>
              </div>
              
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : (
                <div className="p-4">
                  <TransactionTable 
                    transactions={filteredTransactions} 
                    pageSize={10}
                  />
                </div>
              )}
            </div>

            {/* Footer space */}
            <div className="h-16"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
