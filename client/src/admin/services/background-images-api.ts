/**
 * API Service for Background Images (with Designer Support)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fetch all background images (template + designer)
 * Transparently merges both types
 */
export async function fetchAllBackgroundImages(token: string | null) {
  try {
    // Fetch template images
    const templateResponse = await fetch(
      `${API_BASE_URL}/admin/background-images?pageSize=500&order=asc`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    const templates = templateResponse.ok ? await templateResponse.json() : { items: [] };

    // Fetch designer images
    // Note: This will be implemented as a separate list endpoint
    // For now, we'll just combine template images
    const designers = { items: [] };

    // Combine and merge both types
    const allImages = [
      ...(templates.items || []),
      ...(designers.items || []),
    ];

    return allImages;
  } catch (error) {
    console.error('Failed to fetch background images:', error);
    return [];
  }
}

/**
 * Fetch background image by ID (handles both template and designer)
 */
export async function fetchBackgroundImage(id: string, token: string | null) {
  try {
    // Try designer endpoint first
    const designerResponse = await fetch(
      `${API_BASE_URL}/admin/background-images/designer/${id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (designerResponse.ok) {
      return await designerResponse.json();
    }

    // Fall back to template endpoint
    const templateResponse = await fetch(
      `${API_BASE_URL}/admin/background-images/${id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (templateResponse.ok) {
      return await templateResponse.json();
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch background image:', error);
    return null;
  }
}
