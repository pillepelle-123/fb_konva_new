import { FormField } from '../../ui/layout/form-field';
import { RadioGroup, type RadioOption } from '../../ui/primitives/radio-group';

type BookRole = 'author' | 'publisher' | 'owner';

interface QualitySelectorProps {
  value: 'preview' | 'medium' | 'printing' | 'excellent';
  onChange: (value: 'preview' | 'medium' | 'printing' | 'excellent') => void;
  userRole?: BookRole | { role: BookRole } | null; // book_friends.book_role (can be string or object)
  userAdminRole?: string | null; // users.role (for admin check)
}

export function QualitySelector({ value, onChange, userRole, userAdminRole }: QualitySelectorProps) {
  // Handle both object format { role: 'publisher' } and string format 'publisher'
  let roleString: BookRole | null = null;
  if (typeof userRole === 'object' && userRole !== null && 'role' in userRole) {
    roleString = (userRole as { role: BookRole }).role;
  } else if (typeof userRole === 'string') {
    roleString = userRole as BookRole;
  }
  
  // Handle userAdminRole: can be string, null, or undefined
  const adminRoleString = userAdminRole || '';
  const isAuthor = roleString === 'author';
  const isAdmin = adminRoleString.toLowerCase() === 'admin';
  const isPublisherOrOwner = roleString === 'publisher' || roleString === 'owner';
  
  // Printing is available for: admin, publisher, owner
  const canUsePrinting = isAdmin || isPublisherOrOwner;
  const canUseExcellent = isAdmin; // Only admins can use excellent
  
  const options: RadioOption[] = [
    { value: 'preview', label: 'Preview' },
    { value: 'medium', label: 'Medium' },
    {
      value: 'printing',
      label: `For Printing${isAuthor && !isAdmin ? ' (Publisher only)' : ''}`,
      disabled: !canUsePrinting
    },
    ...(canUseExcellent ? [{ value: 'excellent', label: 'Excellent (Admin only)' }] : [])
  ];
  
  return (
    <FormField label="PDF Quality:">
      <RadioGroup
        value={value}
        onValueChange={onChange as (value: string) => void}
        options={options}
      />
    </FormField>
  );
}