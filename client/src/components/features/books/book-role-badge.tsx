import { Badge } from '../../ui/composites/badge';

interface BookRoleBadgeProps {
  userRole?: 'owner' | 'publisher' | 'author';
  variant?: 'addressedToUser' | 'default';
}

export default function BookRoleBadge({ userRole, variant = 'default' }: BookRoleBadgeProps) {
  const getText = () => {
    if (!userRole) return 'Unknown';
    if (variant === 'default') {
      return userRole.charAt(0).toUpperCase() + userRole.slice(1);
    }
    return userRole === 'owner' ? 'You are the owner' : 
           userRole === 'publisher' ? 'You are a publisher' : 
           'You are an author';
  };

  return (
    <Badge variant={
      userRole === 'owner' ? 'highlight' : 
      userRole === 'publisher' ? 'highlight_dense' : 
      'secondary'
    }>
      {getText()}
    </Badge>
  );
}