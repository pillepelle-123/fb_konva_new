import { File, Users } from 'lucide-react';

export default function PageUserIcon({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <File className="h-3 w-3 md:h-4 md:w-4 mb-1" />
      <Users className="h-3 w-3 md:h-4 md:w-4 -ml-2 -mb-1 bg-white" />
    </div>
  );
}