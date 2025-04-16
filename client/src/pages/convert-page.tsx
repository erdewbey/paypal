import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import CurrencyConverter from "@/components/currency-converter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function ConvertPage() {
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

  // Fetch exchange rate data with refetch
  const { data: exchangeRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["/api/exchange-rates/USD_TRY"],
    refetchOnWindowFocus: true, // Pencere tekrar odaklandığında yeniden sorgulama yap
    refetchInterval: 60000, // 1 dakika aralıklarla otomatik yeniden sorgulama
    staleTime: 30000, // 30 saniye sonra veriyi "bayat" olarak işaretle
  });

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
        activePage="convert"
      />

      {/* Main content */}
      <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
        <div className="py-6">
          {/* Page header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
            <div className="lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mt-10 lg:mt-0">
                  Para Dönüşümü
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  PayPal bakiyenizi Türk Lirasına dönüştürmek için aşağıdaki formu doldurun.
                </p>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Para Dönüştürme
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  PayPal bakiyenizi Türk Lirasına dönüştürün.
                </p>
              </div>
              
              <CurrencyConverter 
                exchangeRate={exchangeRates} 
                fullPage 
              />
            </div>

            {/* How It Works Section */}
            <div className="mt-8">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 bg-gray-50">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nasıl Çalışır?
                  </h3>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600">
                          <span className="text-xl font-bold">1</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg leading-6 font-medium text-gray-900">Dönüştürmek İstediğiniz Miktarı Girin</h4>
                        <p className="mt-2 text-base text-gray-500">
                          PayPal'dan TL'ye çevirmek istediğiniz dolar miktarını yukarıdaki alana girin. Sistem otomatik olarak güncel kur ve komisyon oranı üzerinden alacağınız TL miktarını hesaplayacaktır.
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600">
                          <span className="text-xl font-bold">2</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg leading-6 font-medium text-gray-900">PayPal Ödemesi Yapın</h4>
                        <p className="mt-2 text-base text-gray-500">
                          Dönüşümü başlattıktan sonra, belirtilen PayPal hesabına ödeme yapın ve ödeme ekran görüntüsünü yükleyin. Ödemenizi doğrulamak için işlemi tamamlayın butonu ile işlemi onaylayın.
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600">
                          <span className="text-xl font-bold">3</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg leading-6 font-medium text-gray-900">Onay Bekleyin</h4>
                        <p className="mt-2 text-base text-gray-500">
                          Yöneticilerimiz ödemenizi kontrol edecek ve onaylayacaktır. İşlem onaylandığında, dönüştürülen TL tutarı dijital cüzdanınıza aktarılacaktır.
                        </p>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-100 text-primary-600">
                          <span className="text-xl font-bold">4</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg leading-6 font-medium text-gray-900">Paranızı Kullanın veya Çekin</h4>
                        <p className="mt-2 text-base text-gray-500">
                          Cüzdanınıza aktarılan TL'yi dilediğiniz zaman banka hesabınıza veya kripto cüzdanınıza çekebilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
