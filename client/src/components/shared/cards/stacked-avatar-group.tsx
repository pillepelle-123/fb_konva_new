import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/overlays/popover';
import { Tooltip } from '../../ui/composites/tooltip';
import ProfilePicture from '../../features/users/profile-picture';
import ProfileDialog from '../../features/users/profile-dialog';

function getConsistentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['3b82f6', '8b5cf6', 'ef4444', '10b981', 'f59e0b', 'ec4899', '06b6d4', 'f97316'];
  return colors[Math.abs(hash) % colors.length];
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface StackedAvatarGroupProps {
  users: User[];
  maxVisible?: number;
}



export default function StackedAvatarGroup({ users, maxVisible = 3 }: StackedAvatarGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <>
      <div className="flex -space-x-4">
        {visibleUsers.map((user, index) => (
          <Tooltip key={user.id} content={user.name} side="bottom">
            <div onClick={() => setSelectedUserId(user.id)}>
              <ProfilePicture name={user.name} size="sm" userId={user.id} className="ring-2 ring-white cursor-pointer hover:z-10 hover:scale-110 transition-transform duration-200 relative" />
            </div>
          </Tooltip>
        ))}
        
        {remainingCount > 0 && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-500 text-xs font-medium text-white ring-2 ring-white cursor-pointer hover:bg-gray-600">
                +{remainingCount}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="space-y-1">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setIsOpen(false);
                    }}
                  >
                    <ProfilePicture name={user.name} size="sm" userId={user.id} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      <ProfileDialog
        userId={selectedUserId!}
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />
    </>
  );
}