/**
 * Permissions service - fetches and maps user role data from API.
 */

import type { AbilityUser } from '../../../shared/permissions/types';

export type ApiUserRoleResponse = {
  role: string;
  assignedPages?: number[];
  page_access_level?: string;
  editor_interaction_level?: string;
};

/**
 * Maps API user-role response to AbilityUser format.
 */
export function mapApiRoleToAbilityUser(
  apiResponse: ApiUserRoleResponse | null,
  userId?: number
): AbilityUser | null {
  if (!apiResponse) return null;

  const role = apiResponse.role;
  const bookRole: AbilityUser['role'] =
    role === 'owner'
      ? 'owner'
      : role === 'publisher'
        ? 'publisher'
        : role === 'author'
          ? 'author'
          : 'author';

  return {
    id: userId,
    role: bookRole,
    pageAccessLevel:
      (apiResponse.page_access_level as AbilityUser['pageAccessLevel']) ??
      'own_page',
    editorInteractionLevel:
      (apiResponse.editor_interaction_level as AbilityUser['editorInteractionLevel']) ??
      'full_edit',
  };
}

/**
 * Fetches user role for a book from the API.
 */
export async function fetchUserRole(
  bookId: string | number,
  userId?: number
): Promise<AbilityUser | null> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  const response = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const data: ApiUserRoleResponse = await response.json();
  return mapApiRoleToAbilityUser(data, userId);
}
