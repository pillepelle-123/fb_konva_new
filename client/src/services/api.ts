class ApiService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Book operations
  async loadBook(
    bookId: number,
    options?: { pageOffset?: number; pageLimit?: number; pagesOnly?: boolean }
  ) {
    const params = new URLSearchParams();
    if (typeof options?.pageOffset === 'number') {
      params.append('pageOffset', String(options.pageOffset));
    }
    if (typeof options?.pageLimit === 'number') {
      params.append('pageLimit', String(options.pageLimit));
    }
    if (typeof options?.pagesOnly === 'boolean') {
      params.append('pagesOnly', String(options.pagesOnly));
    }
    const query = params.toString() ? `?${params.toString()}` : '';

    // Use the single endpoint that returns everything
    const response = await fetch(`${this.baseUrl}/books/${bookId}${query}`, { headers: this.getHeaders() });
    const data = await response.json();
    
    // Extract data from the response
    const book = {
      id: data.id,
      name: data.name,
      pageSize: data.pageSize,
      orientation: data.orientation,
      pages: data.pages,
      bookTheme: data.bookTheme,
      owner_id: data.owner_id,
      isTemporary: data.isTemporary,
      layoutTemplateId: data.layoutTemplateId,
      themeId: data.themeId,
      colorPaletteId: data.colorPaletteId,
      minPages: data.minPages ?? data.min_pages ?? null,
      maxPages: data.maxPages ?? data.max_pages ?? null,
      pagePairingEnabled: data.pagePairingEnabled ?? data.page_pairing_enabled ?? false,
      specialPagesConfig: data.specialPagesConfig ?? data.special_pages_config ?? null,
      layoutStrategy: data.layoutStrategy ?? data.layout_strategy ?? null,
      layoutRandomMode: data.layoutRandomMode ?? data.layout_random_mode ?? null,
      assistedLayouts: data.assistedLayouts ?? data.assisted_layouts ?? null
    };
    
    const questions = data.questions || [];
    const answers = data.answers || [];
    const userRole = data.userRole;
    const pageAssignments = data.pageAssignments || [];
    
    return { book, questions, answers, userRole, pageAssignments };
  }

  async saveBook(bookData: any, tempQuestions: Record<string, string>, tempAnswers: Record<string, Record<number, { text: string; answerId: string }>>, newQuestions: any[], pageAssignments: any, bookFriends: any[]) {
    // Save book with UPSERT logic for pages
    // WICHTIG: id muss die numerische DB-ID sein für Updates, oder undefined für neue Seiten
    const bookToSave = {
      ...bookData,
      pages: bookData.pages.map(page => {
        // Verwende id falls bereits gesetzt (sollte DB-ID sein), sonst database_id, sonst undefined
        const pageId = page.id || page.database_id || undefined;
        return {
          ...page,
          id: pageId,
          // Stelle sicher, dass elements ein Array ist
          elements: Array.isArray(page.elements) ? page.elements : []
        };
      })
    };
    
    // Debug: Log was gesendet wird
    console.log('apiService.saveBook sending:', {
      bookId: bookToSave.id,
      pageCount: bookToSave.pages.length,
      firstPage: {
        id: bookToSave.pages[0]?.id,
        elementsCount: bookToSave.pages[0]?.elements?.length || 0,
        hasElements: Array.isArray(bookToSave.pages[0]?.elements) && bookToSave.pages[0].elements.length > 0
      }
    });
    
    const response = await fetch(`${this.baseUrl}/books/${bookData.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(bookToSave)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('apiService.saveBook failed:', response.status, errorText);
    } else {
      console.log('apiService.saveBook success:', response.status);
    }
  }

  // Question operations
  async getQuestions(bookId: number) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/questions`, { headers: this.getHeaders() });
    return response.ok ? response.json() : [];
  }

  async createQuestion(bookId: number, questionText: string, questionId?: string) {
    const response = await fetch(`${this.baseUrl}/questions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        id: questionId,
        bookId, 
        questionText 
      })
    });
    return response.json();
  }

  async updateQuestion(questionId: string, questionText: string) {
    const response = await fetch(`${this.baseUrl}/questions/${questionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ questionText })
    });
    return response.json();
  }

  async deleteQuestion(questionId: string) {
    await fetch(`${this.baseUrl}/questions/${questionId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
  }

  // Answer operations
  async getUserAnswers(bookId: number) {
    const response = await fetch(`${this.baseUrl}/answers/book/${bookId}`, { headers: this.getHeaders() });
    return response.ok ? response.json() : [];
  }

  async getQuestionAnswers(questionId: string) {
    const response = await fetch(`${this.baseUrl}/answers/question/${questionId}`, { headers: this.getHeaders() });
    return response.ok ? response.json() : [];
  }

  async saveAnswer(questionId: string, answerText: string, userId: number, answerId?: string) {
    const response = await fetch(`${this.baseUrl}/answers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ 
        id: answerId,
        questionId, 
        answerText, 
        userId 
      })
    });
    return response.json();
  }

  async deleteAnswer(answerId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/answers/${answerId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return response.ok || response.status === 404;
    } catch {
      return true; // Ignore errors
    }
  }

  // User role operations
  async getUserRole(bookId: number) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/user-role`, { headers: this.getHeaders() });
    return response.ok ? response.json() : null;
  }

  // Question pool operations
  async getQuestionPool(category?: string, language?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (language) params.append('language', language);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${this.baseUrl}/question-pool${queryString}`, { headers: this.getHeaders() });
    return response.ok ? response.json() : [];
  }

  async getQuestionPoolCategories() {
    const response = await fetch(`${this.baseUrl}/question-pool/categories`, { headers: this.getHeaders() });
    return response.ok ? response.json() : [];
  }

  async addQuestionsFromPool(bookId: number, questionPoolIds: number[]) {
    const response = await fetch(`${this.baseUrl}/questions/from-pool`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ bookId, questionPoolIds })
    });
    return response.json();
  }
}

export const apiService = new ApiService();

// Template API functions (exported for direct use)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchTemplates = async (category?: string) => {
  const url = category ? `${API_URL}/templates?category=${category}` : `${API_URL}/templates`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
};

export const fetchTemplate = async (id: string) => {
  const response = await fetch(`${API_URL}/templates/${id}`);
  if (!response.ok) throw new Error('Failed to fetch template');
  return response.json();
};

export const fetchColorPalettes = async () => {
  const response = await fetch(`${API_URL}/color-palettes`);
  if (!response.ok) throw new Error('Failed to fetch color palettes');
  return response.json();
};

export const createPageFromTemplate = async (templateId: string, paletteId: string, pageIndex: number, customizations: any) => {
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