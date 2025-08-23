import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Notification } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  BellOff, 
  ChevronLeft, 
  Trash2, 
  MoreVertical, 
  CheckCheck, 
  Mail, 
  MailOpen, 
  Star,
  Clock,
  Target,
  ShoppingBag,
  AlertCircle,
  Info,
  Loader2,
  Bookmark
} from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { format } from "date-fns";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest("PUT", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", "/api/notifications/mark-all-read", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All notifications marked as read.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest("DELETE", `/api/notifications/${notificationId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Save deal mutation
  const saveDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      await apiRequest("POST", `/api/deals/${dealId}/save`);
    },
    onSuccess: () => {
      toast({
        title: "Deal Saved",
        description: "Deal has been added to your saved list",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-deals"] });
    },
    onError: (error: any) => {
      // Check if it's already saved error
      if (error.message && error.message.includes("Deal already saved")) {
        toast({
          title: "Already Saved",
          description: "This deal is already in your saved list",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save deal",
          variant: "destructive",
        });
      }
    },
  });

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread") return !notification.isRead;
    if (filter === "read") return notification.isRead;
    return true;
  });

  // Handle notification selection
  const toggleNotificationSelection = (notificationId: number) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId) 
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAllNotifications = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    for (const notificationId of selectedNotifications) {
      deleteNotificationMutation.mutate(notificationId);
    }
    setSelectedNotifications([]);
    toast({
      title: "Deleted",
      description: `${selectedNotifications.length} notifications deleted.`,
    });
  };

  const handleBulkMarkAsRead = async () => {
    for (const notificationId of selectedNotifications) {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        markAsReadMutation.mutate(notificationId);
      }
    }
    setSelectedNotifications([]);
    toast({
      title: "Success",
      description: `${selectedNotifications.length} notifications marked as read.`,
    });
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deal_created':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'deal_claimed':
        return <ShoppingBag className="w-4 h-4 text-green-500" />;
      case 'deal_expired':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'deal_reminder':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'system':
        return <Info className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const unreadCount = unreadData?.count || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  Notifications
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {unreadCount > 0 ? `${unreadCount} unread messages` : "All caught up!"}
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark All Read
                </Button>
              )}
              
              {selectedNotifications.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleBulkMarkAsRead}>
                      <MailOpen className="w-4 h-4 mr-2" />
                      Mark as Read
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleBulkDelete}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Filter tabs */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(["all", "unread", "read"] as const).map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className="capitalize"
                >
                  {filterType === "unread" && unreadCount > 0 && (
                    <Badge variant="destructive" className="mr-2 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                  {filterType}
                </Button>
              ))}
            </div>
            
            {filteredNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedNotifications.length === filteredNotifications.length}
                  onCheckedChange={selectAllNotifications}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Select All ({filteredNotifications.length})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto p-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BellOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {filter === "unread" ? "No unread notifications" :
                 filter === "read" ? "No read notifications" :
                 "You're all caught up! Check back later for new notifications."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all ${
                  !notification.isRead 
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                } ${
                  selectedNotifications.includes(notification.id)
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedNotifications.includes(notification.id)}
                      onCheckedChange={() => toggleNotificationSelection(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getNotificationIcon(notification.type)}
                        <h3 className={`font-medium ${!notification.isRead ? "font-bold" : ""}`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(notification.createdAt!), "MMM dd, yyyy 'at' h:mm a")}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {notification.isRead ? (
                            <MailOpen className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Mail className="w-4 h-4 text-blue-500" />
                          )}
                          
                          {/* Save Deal Button - only show for deal notifications */}
                          {notification.dealId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveDealMutation.mutate(notification.dealId!);
                              }}
                              disabled={saveDealMutation.isPending}
                              className="text-gray-500 hover:text-blue-500"
                              title="Save Deal"
                            >
                              <Bookmark className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            className="text-gray-500 hover:text-red-500"
                            title="Delete Notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="notifications" 
        onAuditClick={() => {}} 
      />
    </div>
  );
}