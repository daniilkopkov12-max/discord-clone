import React from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';

interface AttachmentItem {
  file: File;
  previewUrl?: string;
}

interface AttachmentPreviewProps {
  attachments: AttachmentItem[];
  onRemove: (index: number) => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemove,
}) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-[#2B2D31] rounded-t border-b border-[#35363C] max-h-36 overflow-y-auto">
      {attachments.map((item, index) => {
        const isImage = item.file.type.startsWith('image/');

        return (
          <div
            key={index}
            className="relative group bg-[#1E1F22] rounded p-2 flex items-center gap-2 border border-[#35363C] max-w-[200px]"
          >
            {isImage && item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="w-10 h-10 object-cover rounded flex-shrink-0"
              />
            ) : (
              <FileText className="w-8 h-8 text-discord-blurple flex-shrink-0" />
            )}

            <div className="overflow-hidden flex-1">
              <div className="text-xs text-[#DBDEE1] font-medium truncate">
                {item.file.name}
              </div>
              <div className="text-[10px] text-[#949BA4]">
                {(item.file.size / 1024).toFixed(1)} KB
              </div>
            </div>

            <button
              onClick={() => onRemove(index)}
              className="absolute -top-1.5 -right-1.5 bg-[#ED4245] hover:bg-red-700 text-white rounded-full p-0.5 shadow transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
