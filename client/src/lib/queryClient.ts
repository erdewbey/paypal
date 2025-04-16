import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// CSRF token için durum yönetimi
let csrfToken: string | null = null;

// CSRF token dışarıdan ayarlamak için export edilen fonksiyon
export function setCsrfToken(token: string) {
  csrfToken = token;
}

// CSRF token al
async function getCsrfToken(): Promise<string> {
  // Eğer token zaten varsa onu kullan
  if (csrfToken) {
    return csrfToken;
  }
  
  try {
    // Token endpoint'inden yeni token al
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('CSRF token alınamadı');
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken as string;
  } catch (error) {
    console.error('CSRF token alma hatası:', error);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Sadece POST, PUT, PATCH, DELETE gibi methodlar için CSRF token gerekir
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  
  // Header'ları hazırla
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // CSRF token gerekliyse ekle
  if (needsCsrf) {
    try {
      const token = await getCsrfToken();
      headers['CSRF-Token'] = token;
    } catch (error) {
      console.error('CSRF token eklenemedi:', error);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // 403 hatası CSRF hatası olabilir, tokeni sıfırlayalım
  if (res.status === 403) {
    csrfToken = null; // Tokeni sıfırla
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // İstek için gerekli header'ları hazırla
    const headers: Record<string, string> = {};
    
    // Eğer bir CSRF token kayıtlıysa onu ekleyelim
    if (csrfToken) {
      headers['CSRF-Token'] = csrfToken;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: headers
    });

    // 403 hatası CSRF hatası olabilir, tokeni sıfırlayalım
    if (res.status === 403) {
      csrfToken = null; // Tokeni sıfırla
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
