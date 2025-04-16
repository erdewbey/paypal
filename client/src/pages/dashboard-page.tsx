import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight } from "lucide-react";
import CurrencyConverter from "@/components/currency-converter";
import TransactionTable from "@/components/transaction-table";
import PendingTransactions from "@/components/pending-transactions";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Responsive handling
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Fetch balance data
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/balance"],
  });

  // Fetch exchange rate data
  const { data: exchangeRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["/api/exchange-rates/USD_TRY"],
  });

  // Fetch user transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });

  // Get pending transactions
  const pendingTransactions = transactions?.filter(
    transaction => transaction.status === "pending" || transaction.status === "processing"
  ) || [];

  // Format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const lastLoginDate = user?.createdAt ? formatDate(user.createdAt) : "";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <div className="lg:hidden fixed top-0 left-0 z-40 w-full">
          <div className="bg-white shadow-md p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1L1 7l11 6 11-6-11-6zM1 17l11 6 11-6M1 12l11 6 11-6"/>
                  </svg>
                  <span className="font-bold text-lg text-primary">TRY Exchange</span>
                </div>
              </Link>
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
        onToggleMobileSidebar={() => setShowMobileSidebar(true)}
        setShowMobileSidebar={setShowMobileSidebar}
      />

      {/* Main content */}
      <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
        <div className="py-6">
          {/* Page header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
            <div className="lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mt-16 lg:mt-0">
                  Hoş Geldiniz, {user?.firstName}!
                </h2>
                <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Son Giriş: {lastLoginDate}</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex lg:mt-0 lg:ml-4">
                <Link href="/convert">
                  <span>
                    <Button className="w-full sm:w-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Yeni Dönüşüm
                    </Button>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Stats cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Balance card */}
              <StatsCard
                title="Bakiyeniz"
                value={balanceLoading ? "Yükleniyor..." : `${parseFloat(balanceData?.balance || "0").toLocaleString('tr-TR')} ₺`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
                iconBgColor="bg-primary-100"
                iconColor="text-primary-600"
                linkText="Para Çek"
                linkHref="/wallet"
              />

              {/* Exchange rate card */}
              <StatsCard
                title="Güncel Kur"
                value={ratesLoading ? "Yükleniyor..." : `1 $ = ${parseFloat(exchangeRates?.rate || "0").toLocaleString('tr-TR')} ₺`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                }
                iconBgColor="bg-teal-100"
                iconColor="text-teal-600"
                linkText="Dönüştür"
                linkHref="/convert"
              />

              {/* Pending transactions card */}
              <StatsCard
                title="Bekleyen İşlemler"
                value={transactionsLoading ? "Yükleniyor..." : pendingTransactions.length.toString()}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                iconBgColor="bg-amber-100"
                iconColor="text-amber-600"
                linkText="Görüntüle"
                linkHref="#pending"
              />
            </div>

            {/* Currency Converter */}
            <div className="mt-8">
              <CurrencyConverter exchangeRate={exchangeRates} />
            </div>

            {/* Pending Transactions Section */}
            {pendingTransactions.length > 0 && (
              <div className="mt-8" id="pending">
                <PendingTransactions transactions={pendingTransactions} />
              </div>
            )}

            {/* Recent Transactions Section */}
            <div className="mt-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Son İşlemler
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Son 30 gün içindeki işlemleriniz.
                    </p>
                  </div>
                  <Link href="/history">
                    <span className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center cursor-pointer">
                      Tümünü Gör <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
                  </Link>
                </div>
                {transactionsLoading ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <TransactionTable 
                    transactions={transactions.slice(0, 3)} 
                    showPagination={false} 
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    Henüz işlem yapılmamış. Para dönüşümü yapmak için "Yeni Dönüşüm" butonuna tıklayabilirsiniz.
                  </div>
                )}
              </div>
            </div>

            {/* Footer space */}
            <div className="h-16"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
