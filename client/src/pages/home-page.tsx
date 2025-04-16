import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Shield, RefreshCw, Wallet, CheckCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Responsive handling
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Fetch exchange rate data
  const { data: exchangeRates } = useQuery({
    queryKey: ["/api/exchange-rates/USD_TRY"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header / Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded bg-primary-700 flex items-center justify-center text-white">
                <RefreshCw size={20} />
              </div>
              <span className="ml-3 text-xl font-bold text-primary-700">ebupay</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/convert">
                <span className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium cursor-pointer">
                  Dönüştür
                </span>
              </Link>
              <Link href="/wallet">
                <span className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium cursor-pointer">
                  Cüzdan
                </span>
              </Link>
              <Link href="/history">
                <span className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium cursor-pointer">
                  İşlemler
                </span>
              </Link>
              <Link href={user ? "/dashboard" : "/auth"}>
                <Button>
                  {user ? 'Dashboard' : 'Giriş Yap'}
                </Button>
              </Link>
            </div>

            <div className="md:hidden">
              <Link href={user ? "/dashboard" : "/auth"}>
                <Button>
                  {user ? 'Dashboard' : 'Giriş Yap'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                PayPal Bakiyenizi <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">Türk Lirasına</span> Dönüştürün
              </h1>
              <p className="mt-4 text-lg md:text-xl text-gray-600">
                ebupay ile PayPal bakiyenizi güvenli, hızlı ve uygun komisyon oranlarıyla Türk Lirasına dönüştürebilirsiniz.
              </p>
              
              {exchangeRates && (
                <div className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800">
                  <RefreshCw size={18} className="mr-2" />
                  <span>Güncel Kur: 1 USD = {parseFloat(exchangeRates.rate).toLocaleString('tr-TR')} ₺</span>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href={user ? "/convert" : "/auth"}>
                  <Button size="lg" className="w-full sm:w-auto">
                    {user ? 'Dönüşüm Yap' : 'Hesap Oluştur'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href={user ? "/wallet" : "/auth"}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    {user ? 'Cüzdanım' : 'Giriş Yap'}
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="hidden md:block relative">
              <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    <RefreshCw size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Örnek Dönüşüm</h3>
                    <p className="text-sm text-gray-500">Güncel kur ile</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">PayPal Bakiyesi</div>
                    <div className="text-2xl font-semibold">$100.00</div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <ArrowRight className="h-6 w-6 text-primary-600" />
                      </div>
                    </div>
                    <hr className="border-gray-200" />
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Türk Lirası</div>
                    <div className="text-2xl font-semibold">
                      {exchangeRates 
                        ? `₺${(parseFloat(exchangeRates.rate) * 100 * (1 - parseFloat(exchangeRates.commissionRate) / 100)).toLocaleString('tr-TR')}`
                        : "Yükleniyor..."}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Komisyon: {exchangeRates ? `%${exchangeRates.commissionRate}` : "..."}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decoration */}
              <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-primary-100 rounded-full -z-10" />
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-amber-100 rounded-full -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Neden <span className="text-primary-600">ebupay</span>?</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              PayPal bakiyenizi Türk Lirasına çevirmenin en güvenli ve kolay yolu
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                <Shield size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Güvenli İşlemler</h3>
              <p className="text-gray-600">
                Tüm işlemleriniz şifreli ve güvenli bir şekilde gerçekleştirilir. Verileriniz bizimle güvende.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                <RefreshCw size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Uygun Kur</h3>
              <p className="text-gray-600">
                Piyasanın en uygun kurları ve düşük komisyon oranları ile bakiyenizi dönüştürün.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                <Wallet size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Hızlı Çekim</h3>
              <p className="text-gray-600">
                İşleminiz onaylandıktan sonra bakiyenizi hızlıca banka hesabınıza çekebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Nasıl Çalışır?</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Sadece 3 adımda PayPal bakiyenizi Türk Lirasına dönüştürün
            </p>
          </div>
          
          <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Hesap Oluşturun</h3>
              <p className="text-gray-600 mb-4">
                Hızlıca ücretsiz bir hesap oluşturun ve kimlik bilgilerinizi doğrulayın.
              </p>
              <div className="hidden md:block absolute top-24 right-0 w-full">
                <ChevronRight className="h-8 w-8 text-gray-300 mx-auto" />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">PayPal'dan Dönüşüm Yapın</h3>
              <p className="text-gray-600 mb-4">
                Dönüştürmek istediğiniz tutarı belirleyin ve PayPal hesabınızdan ödeme yapın.
              </p>
              <div className="hidden md:block absolute top-24 right-0 w-full">
                <ChevronRight className="h-8 w-8 text-gray-300 mx-auto" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Türk Lirası Alın</h3>
              <p className="text-gray-600 mb-4">
                İşleminiz onaylandıktan sonra Türk Lirası bakiyenizi dilediğiniz gibi kullanın.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Kullanıcı Yorumları</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Binlerce mutlu kullanıcımızdan bazıları
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  A
                </div>
                <div className="ml-3">
                  <h4 className="font-medium">Ahmet K.</h4>
                  <div className="flex text-amber-500">
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Freelancer olarak yurtdışından aldığım ödemeleri ebupay sayesinde çok kolay bir şekilde TL'ye çevirebiliyorum. Düşük komisyon oranları ve hızlı işlem süreçleri için teşekkürler!"
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  M
                </div>
                <div className="ml-3">
                  <h4 className="font-medium">Merve S.</h4>
                  <div className="flex text-amber-500">
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Dijital ürün satışlarımdan gelen PayPal ödemelerini ebupay üzerinden TL'ye çeviriyorum. 6 aydır kullanıyorum ve hiç sorun yaşamadım. Kesinlikle tavsiye ederim."
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  E
                </div>
                <div className="ml-3">
                  <h4 className="font-medium">Emre T.</h4>
                  <div className="flex text-amber-500">
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                    <CheckCircle size={16} />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Yurtdışındaki müşterilerimden PayPal ile tahsilat yapıp ebupay üzerinden TL'ye çeviriyorum. Kurlar ve komisyonlar çok uygun, ihtiyacım olan çözüm tam da bu!"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Hemen Başlayın</h2>
          <p className="mt-4 text-lg text-primary-100 max-w-3xl mx-auto">
            PayPal bakiyenizi en uygun kurlarla Türk Lirasına dönüştürmek için hemen ücretsiz hesap oluşturun.
          </p>
          <div className="mt-8">
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="px-8">
                Ücretsiz Kaydol
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded bg-primary-700 flex items-center justify-center text-white">
                  <RefreshCw size={20} />
                </div>
                <span className="ml-3 text-xl font-bold text-white">ebupay</span>
              </div>
              <p className="text-sm">
                PayPal bakiyenizi güvenli ve hızlı bir şekilde Türk Lirasına dönüştürmenin en kolay yolu.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-4">Hızlı Bağlantılar</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/"><span className="hover:text-white cursor-pointer">Ana Sayfa</span></Link></li>
                <li><Link href="/convert"><span className="hover:text-white cursor-pointer">Dönüştür</span></Link></li>
                <li><Link href="/wallet"><span className="hover:text-white cursor-pointer">Cüzdan</span></Link></li>
                <li><Link href="/history"><span className="hover:text-white cursor-pointer">İşlemler</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-4">Yasal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Kullanım Koşulları</a></li>
                <li><a href="#" className="hover:text-white">Gizlilik Politikası</a></li>
                <li><a href="#" className="hover:text-white">KVK Aydınlatma Metni</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-4">İletişim</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>destek@ebupay.com</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>0850 123 45 67</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} ebupay. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}