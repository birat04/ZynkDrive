"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/actions/notification.actions";

type NotificationItem = {
  $id: string;
  type: string;
  read: boolean;
  payload: Record<string, unknown>;
  createdAt?: string;
};

const getNotificationLabel = (notification: NotificationItem) => {
  const payload = notification.payload;

  switch (notification.type) {
    case "share":
      return `Shared: ${String(payload.fileName || "a file")}`;
    case "comment":
      return `Comment on ${String(payload.fileName || "a file")}`;
    case "mention":
      return String(payload.message || "You were mentioned");
    case "quota":
      return String(payload.message || "Storage quota update");
    case "security":
      return String(payload.message || "Security alert");
    default:
      return "Notification";
  }
};

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const result = await getUserNotifications(false, 20);
      setNotifications((result?.notifications as unknown as NotificationItem[]) || []);
      const unread = (result?.notifications as unknown as NotificationItem[] | undefined)?.filter(
        (item) => !item.read
      ).length;
      setUnreadCount(unread || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    toast.success("All notifications marked as read");
    await loadNotifications();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-light-200 px-3 py-2">
          <p className="text-sm font-medium text-light-100">Notifications</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="caption text-brand hover:underline"
              onClick={() => void handleMarkAllRead()}
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-light-200">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.$id}
                className="flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5"
                onClick={() => {
                  if (!notification.read) void handleMarkRead(notification.$id);
                }}
              >
                <p className={`text-sm ${notification.read ? "text-light-200" : "text-light-100"}`}>
                  {getNotificationLabel(notification)}
                </p>
                <FormattedDateTime
                  isoString={notification.createdAt}
                  className="caption text-light-200"
                />
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
