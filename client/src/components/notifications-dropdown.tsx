import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, Trash2, Mail, AlertCircle, Info, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Notification {
  id: number;
  userId: number | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  createdAt: string;
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  
  // Okunmamış bildirimleri getir
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: getQueryFn({on401: "throw"}),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });
  
  // Bildirimi okundu olarak işaretle
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Bildirim işaretlenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/notifications/mark-all-read`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Başarılı",
        description: "Tüm bildirimler okundu olarak işaretlendi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Bildirimler işaretlenirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Bildirimi sil
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/notifications/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: "Bildirim silinirken bir hata oluştu: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Bildirim açıldığında işlem yap
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    // Popover açıldığında bildirimleri yenile
    if (open) {
      refetch();
    }
  };
  
  // Bildirimin tarihini formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy, HH:mm', { locale: tr });
  };
  
  // Bildirim tipine göre simge belirle
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Okunmamış bildirim sayısı
  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: Notification) => !n.isRead).length : 0;
  
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between p-4 bg-muted/50">
          <h3 className="font-medium">Bildirimler</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1 text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>
        <Separator />
        
        {isLoading ? (
          <div className="flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : !Array.isArray(notifications) || notifications.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Henüz bildiriminiz bulunmuyor.</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 border-b last:border-0 hover:bg-muted/40 ${notification.isRead ? '' : 'bg-muted/30'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-gray-400">{formatDate(notification.createdAt)}</p>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    {!notification.isRead && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => deleteNotificationMutation.mutate(notification.id)}
                      disabled={deleteNotificationMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}