import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  CornerDownRight,
  Maximize2,
  Trash2,
  Edit3,
  Copy,
  MoreVertical,
  Reply,
  AlertCircle,
  FileText,
  File,
  Download,
  Archive,
  Table,
} from 'lucide-react';
import { ChatMessage, PrivateMessage, getUserNameColor } from '../data/chat';
import { UserRole } from '../types';
import { CloudImage } from './CloudImage';
import { formatFileSize, getFileCategory } from '../services/firebase';

interface MessageBubbleProps {
  message: ChatMessage | PrivateMessage;
  isMe: boolean;
  currentUser: { id: number; role: UserRole };
  senderMeta: { role: UserRole; avatarUrl?: string | null; warningsCount?: number };
  highlightedMessageId: string | null;
  onReply: (msg: ChatMessage | PrivateMessage) => void;
  onEdit: (msg: ChatMessage | PrivateMessage) => void;
  onDelete: (msg: ChatMessage | PrivateMessage) => void;
  onCopy: (msg: ChatMessage | PrivateMessage) => void;
  onQuoteClick: (replyToId: string) => void;
  onImageClick: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  currentUser,
  senderMeta,
  highlightedMessageId,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onQuoteClick,
  onImageClick,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const longPressTimerRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isOwnerMsg = senderMeta.role === 'owner' || message.senderId === 1;
  const isModeratorMsg = senderMeta.role === 'moderator' && !isOwnerMsg;
  const isHighlighted = highlightedMessageId === message.id;
  const fileCategory =
    message.fileName || message.fileUrl
      ? getFileCategory(message.fileName || 'file', message.fileType)
      : 'file';

  const canEdit = message.senderId === currentUser.id && !message.isDeleted;
  const canDelete =
    !message.isDeleted &&
    (message.senderId === currentUser.id ||
      currentUser.id === 1 ||
      currentUser.role === 'owner');

  const formatMessageTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClose = () => setShowContextMenu(false);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [showContextMenu]);

  const openMenuAt = (clientX: number, clientY: number) => {
    // Keep menu within screen boundaries
    const safeX = Math.min(Math.max(16, clientX), window.innerWidth - 180);
    const safeY = Math.min(Math.max(16, clientY), window.innerHeight - 220);
    setMenuPos({ x: safeX, y: safeY });
    setShowContextMenu(true);
  };

  // Touch handlers for Long Press & Swipe to Reply
  const handleTouchStart = (e: React.TouchEvent) => {
    if (message.isDeleted) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;

    // Start long-press timer
    longPressTimerRef.current = window.setTimeout(() => {
      openMenuAt(touch.clientX, touch.clientY);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // Ignore
        }
      }
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;

    // Cancel long press if moved
    if (Math.hypot(dx, dy) > 10 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (message.isDeleted) return;

    // Detect direction lock
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy) + 5;
      }
    }

    // Only swipe if horizontally dragging
    if (isHorizontalSwipeRef.current) {
      setIsSwiping(true);
      // Allow swipe in either direction up to 70px
      const clamped = Math.max(-75, Math.min(75, dx * 0.75));
      setSwipeOffset(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isSwiping) {
      if (Math.abs(swipeOffset) >= 42) {
        onReply(message);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(30);
          } catch {
            // Ignore
          }
        }
      }
      setIsSwiping(false);
      setSwipeOffset(0);
    }
    isHorizontalSwipeRef.current = null;
  };

  // Context menu on desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    if (message.isDeleted) return;
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  };

  // Bubble Styling
  const bubbleStyleClass = message.isDeleted
    ? 'bg-[#0f1522]/90 border border-slate-800/80 text-slate-400 opacity-80'
    : isOwnerMsg
    ? 'bg-gradient-to-br from-amber-500/25 via-amber-600/15 to-[#1c1507] border-2 border-amber-400/90 text-white shadow-lg shadow-amber-500/10'
    : isModeratorMsg
    ? 'bg-gradient-to-br from-emerald-950/70 via-teal-950/50 to-[#0e1f26] border border-emerald-400/60 text-slate-100 shadow-md'
    : isMe
    ? 'bg-gradient-to-br from-[#1a2842] to-[#141f33] border border-amber-500/35 text-slate-100 shadow-md'
    : 'bg-[#131b2c] border border-slate-800/90 text-slate-200';

  return (
    <div
      id={`chat-msg-${message.id}`}
      dir="rtl"
      className={`relative group flex flex-col transition-all duration-300 ${
        isMe ? 'items-start' : 'items-end'
      } ${isHighlighted ? 'scale-[1.01]' : ''}`}
    >
      {/* Swipe Reply Indicator Behind Bubble */}
      {isSwiping && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            swipeOffset > 0 ? 'right-2' : 'left-2'
          } flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-950 shadow-lg transition-transform`}
          style={{
            transform: `translateY(-50%) scale(${Math.min(
              1.2,
              Math.max(0.6, Math.abs(swipeOffset) / 45)
            )})`,
          }}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}

      {/* Bubble Container with Swipe Transform */}
      <div
        ref={bubbleRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
        style={{
          transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        }}
        className={`w-fit max-w-[92%] sm:max-w-[84%] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 relative transition-all select-none cursor-pointer ${bubbleStyleClass} ${
          isHighlighted
            ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.45)] bg-amber-500/20'
            : ''
        }`}
      >
        {/* Desktop Quick Actions Button (on hover) */}
        {!message.isDeleted && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              openMenuAt(rect.left, rect.bottom + 4);
            }}
            className="absolute top-2 left-2 p-1 rounded-lg bg-black/40 hover:bg-black/70 text-slate-400 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center z-10"
            title="خيارات الرسالة"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Sender Header */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            {senderMeta.avatarUrl ? (
              <CloudImage
                src={senderMeta.avatarUrl}
                alt={message.senderName}
                className={`w-6 h-6 rounded-full object-cover border ${
                  isOwnerMsg
                    ? 'border-amber-400'
                    : isModeratorMsg
                    ? 'border-emerald-400'
                    : 'border-slate-600'
                }`}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ color: getUserNameColor(message.senderId) }}
              >
                {message.senderName.charAt(0)}
              </div>
            )}

            <span
              style={{ color: getUserNameColor(message.senderId) }}
              className="text-[11.5px] font-black tracking-tight"
            >
              {message.senderName} {isMe && '(أنت)'}
            </span>

            {isOwnerMsg && (
              <span className="text-[9.5px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.2 rounded-md shadow-xs">
                👑 القائد
              </span>
            )}

            {isModeratorMsg && (
              <span className="text-[9.5px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/50 px-1.5 py-0.2 rounded-md shadow-xs">
                🛡️ مشرف
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0">
            {message.isEdited && !message.isDeleted && (
              <span className="text-[9.5px] font-bold text-amber-400/90 bg-amber-400/10 px-1 rounded">
                تم التعديل
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>{formatMessageTime(message.timestamp)}</span>
            </span>
          </div>
        </div>

        {/* Quoted Message (Reply Preview Box) */}
        {message.replyToId && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (message.replyToId) onQuoteClick(message.replyToId);
            }}
            className="my-1.5 p-2 rounded-xl bg-black/40 hover:bg-black/60 border-r-4 border-amber-400/90 text-right cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-black text-amber-300">
              <CornerDownRight className="w-3 h-3 text-amber-400 rotate-180 shrink-0" />
              <span>{message.replyToSenderName || 'رسالة'}</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 font-medium leading-tight">
              {message.replyToIsDeleted
                ? 'تم حذف الرسالة الأصلية.'
                : message.replyToText || 'رسالة مقتبسة'}
            </p>
          </div>
        )}

        {/* Attached Image (if not soft-deleted) */}
        {!message.isDeleted && message.imageUrl && (
          <div className="relative my-2 rounded-xl overflow-hidden group/img cursor-pointer border border-slate-700/60 bg-black/40">
            <CloudImage
              src={message.imageUrl}
              alt="مرفق الدردشة"
              className="max-h-72 w-auto rounded-xl object-contain mx-auto transition-transform duration-200 group-hover/img:scale-[1.02]"
              onClick={(e) => {
                e.stopPropagation();
                if (message.imageUrl) onImageClick(message.imageUrl);
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (message.imageUrl) onImageClick(message.imageUrl);
              }}
              className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm opacity-90 transition"
              title="تكبير الصورة"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attached File (PDF, Docs, Excel, Zip, etc.) */}
        {!message.isDeleted && (message.fileName || message.fileUrl) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (message.fileUrl) {
                const link = document.createElement('a');
                link.href = message.fileUrl;
                link.download = message.fileName || 'document';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
            className="my-2 p-3 rounded-2xl bg-[#090e17]/90 border border-slate-700/80 hover:border-amber-400/70 transition-all flex items-center justify-between gap-3 group/file cursor-pointer shadow-md"
            title="انقر لتنزيل أو فتح الملف"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  fileCategory === 'pdf'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                    : fileCategory === 'sheet'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : fileCategory === 'doc'
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                    : fileCategory === 'archive'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {fileCategory === 'pdf' ? (
                  <FileText className="w-5 h-5" />
                ) : fileCategory === 'sheet' ? (
                  <Table className="w-5 h-5" />
                ) : fileCategory === 'doc' ? (
                  <FileText className="w-5 h-5" />
                ) : fileCategory === 'archive' ? (
                  <Archive className="w-5 h-5" />
                ) : (
                  <File className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-white truncate group-hover/file:text-amber-300 transition-colors">
                  {message.fileName || 'مستند مرفق'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {message.fileSize ? formatFileSize(message.fileSize) : 'ملف مرفق'} • انقر للتحميل
                </p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 group-hover/file:bg-amber-400 group-hover/file:text-slate-950 text-slate-300 transition-colors shrink-0">
              <Download className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Message Content / Soft Delete */}
        {message.isDeleted ? (
          <div className="flex items-center gap-1.5 py-1 text-slate-400 text-xs sm:text-sm italic font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>تم حذف هذه الرسالة.</span>
          </div>
        ) : (
          message.text && (
            <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words select-text">
              {message.text}
            </p>
          )
        )}
      </div>

      {/* Modern Context Menu Popup for Long Press / Right Click */}
      {showContextMenu && (
        <div
          dir="rtl"
          style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
          className="fixed z-50 w-44 bg-[#141d30]/95 backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.2)] p-1.5 text-right animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reply */}
          <button
            type="button"
            onClick={() => {
              setShowContextMenu(false);
              onReply(message);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-100 hover:text-amber-300 hover:bg-amber-500/15 flex items-center gap-2.5 transition"
          >
            <Reply className="w-3.5 h-3.5 text-amber-400 rotate-180" />
            <span>الرد على الرسالة</span>
          </button>

          {/* Copy */}
          {message.text && (
            <button
              type="button"
              onClick={() => {
                setShowContextMenu(false);
                onCopy(message);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-100 hover:text-amber-300 hover:bg-amber-500/15 flex items-center gap-2.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>نسخ الرسالة</span>
            </button>
          )}

          {/* Edit (Own message only) */}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setShowContextMenu(false);
                onEdit(message);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-100 hover:text-amber-300 hover:bg-amber-500/15 flex items-center gap-2.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تعديل الرسالة</span>
            </button>
          )}

          {/* Delete (Own message or Sami) */}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setShowContextMenu(false);
                onDelete(message);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 flex items-center gap-2.5 transition border-t border-slate-800/80 mt-1"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>حذف الرسالة</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
