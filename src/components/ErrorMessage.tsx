import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  className?: string;
  showIcon?: boolean;
}

export function ErrorMessage({ message, className = '', showIcon = true }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className={`bg-red-900/50 text-red-200 p-4 rounded-lg border border-red-800 ${className}`}>
      <div className="flex items-start space-x-3">
        {showIcon && <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}