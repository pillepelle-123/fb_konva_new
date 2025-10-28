const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Template API functions
export const fetchTemplates = async (category) => {
  const url = category ? `${API_URL}/templates?category=${category}` : `${API_URL}/templates`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
};

export const fetchTemplate = async (id) => {
  const response = await fetch(`${API_URL}/templates/${id}`);
  if (!response.ok) throw new Error('Failed to fetch template');
  return response.json();
};

export const fetchColorPalettes = async () => {
  const response = await fetch(`${API_URL}/color-palettes`);
  if (!response.ok) throw new Error('Failed to fetch color palettes');
  return response.json();
};

export const createPageFromTemplate = async (templateId, paletteId, pageIndex, customizations) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/pages/from-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      templateId,
      paletteId,
      pageIndex,
      customizations
    })
  });
  
  if (!response.ok) throw new Error('Failed to create page from template');
  return response.json();
};

// Export apiService object for compatibility
export const apiService = {
  getQuestions: async (bookId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/books/${bookId}/questions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    return response.json();
  },
  getUserAnswers: async (bookId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/books/${bookId}/answers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    return response.json();
  },
  createQuestion: async () => ({ id: 1 }),
  updateQuestion: async () => ({}),
  deleteQuestion: async () => ({}),
  getQuestionPools: async () => ({ pools: [] }),
  getQuestionsFromPool: async () => ({ questions: [] })
};