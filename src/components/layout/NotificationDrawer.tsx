import React from 'react';
import { X, ArrowRight, CheckCheck, Check, BellOff } from 'lucide-react';
import { ScreenType, AppNotification } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigate: (screen: ScreenType) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigate,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const { user } = useAuth();
  const displayFarmName = user?.farmName || 'Patel Farm';

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slideover Panel */}
      <div className="drawer-enter-right relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-xl z-10 flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors duration-300 ease-out">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Notifications & Alerts</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{displayFarmName} operational logs</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                <BellOff className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">You're all caught up.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                No pending farm alerts at this time. All crop conditions are stable.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-lg border transition-all text-left relative hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs ${
                  n.read
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0"
                        title="Unread notification"
                      />
                    )}
                    <StatusBadge status={n.status} label={n.statusLabel} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{n.time}</span>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(n.id)}
                        className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">{n.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">{n.desc}</p>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(n.actionScreen);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>{n.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead(n.id)}
                      className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="font-medium text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
