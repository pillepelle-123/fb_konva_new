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
  async loadBook(bookId: number) {
    // Use the single endpoint that returns everything
    const response = await fetch(`${this.baseUrl}/books/${bookId}`, { headers: this.getHeaders() });
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
      isTemporary: data.isTemporary
    };
    
    const questions = data.questions || [];
    const answers = data.answers || [];
    const userRole = data.userRole;
    const pageAssignments = data.pageAssignments || [];
    
    return { book, questions, answers, userRole, pageAssignments };
  }

  async saveBook(bookData: any, tempQuestions: Record<string, string>, tempAnswers: Record<string, Record<number, { text: string; answerId: string }>>, newQuestions: any[], pageAssignments: any, bookFriends: any[]) {
    // Save book with UPSERT logic for pages
    const bookToSave = {
      ...bookData,
      pages: bookData.pages.map(page => ({
        ...page,
        id: page.database_id || undefined // Use database_id if exists, undefined for new pages
      }))
    };
    
    await fetch(`${this.baseUrl}/books/${bookData.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(bookToSave)
    });
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
}

export const apiService = new ApiService();