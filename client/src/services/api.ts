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
    const [book, questions, answers, userRole, pageAssignments] = await Promise.all([
      fetch(`${this.baseUrl}/books/${bookId}`, { headers: this.getHeaders() }).then(r => r.json()),
      fetch(`${this.baseUrl}/books/${bookId}/questions`, { headers: this.getHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${this.baseUrl}/answers/book/${bookId}`, { headers: this.getHeaders() }).then(r => r.ok ? r.json() : []),
      fetch(`${this.baseUrl}/books/${bookId}/user-role`, { headers: this.getHeaders() }).then(r => r.ok ? r.json() : null),
      fetch(`${this.baseUrl}/page-assignments/book/${bookId}`, { headers: this.getHeaders() }).then(r => r.ok ? r.json() : [])
    ]);
    
    return { book, questions, answers, userRole, pageAssignments };
  }

  async saveBook(bookData: any, tempQuestions: Record<number, string>, tempAnswers: Record<number, string>, newQuestions: any[], pageAssignments: any, bookFriends: any[]) {
    // Save new questions
    for (const newQuestion of newQuestions) {
      const response = await fetch(`${this.baseUrl}/books/${bookData.id}/questions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ questionText: newQuestion.text })
      });
      if (response.ok) {
        const savedQuestion = await response.json();
        return { questionId: savedQuestion.id, elementId: newQuestion.elementId };
      }
    }

    // Save updated questions
    await Promise.all(
      Object.entries(tempQuestions).map(([questionId, text]) =>
        fetch(`${this.baseUrl}/questions/${questionId}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ questionText: text })
        })
      )
    );

    // Save/delete answers
    await Promise.all(
      Object.entries(tempAnswers).map(([questionId, text]) => {
        if (text.trim() === '') {
          return fetch(`${this.baseUrl}/answers/question/${questionId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
          }).catch(() => {}); // Ignore errors
        } else {
          return fetch(`${this.baseUrl}/answers`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ questionId: parseInt(questionId), answerText: text })
          });
        }
      })
    );

    // Save book
    await fetch(`${this.baseUrl}/books/${bookData.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(bookData)
    });
  }

  // Question operations
  async getQuestions(bookId: number) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/questions`, { headers: this.getHeaders() });
    return response.ok ? response.json() : [];
  }

  async createQuestion(bookId: number, questionText: string) {
    const response = await fetch(`${this.baseUrl}/books/${bookId}/questions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ questionText })
    });
    return response.json();
  }

  async updateQuestion(questionId: number, questionText: string) {
    const response = await fetch(`${this.baseUrl}/questions/${questionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ questionText })
    });
    return response.json();
  }

  async deleteQuestion(questionId: number) {
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

  async saveAnswer(questionId: number, answerText: string) {
    const response = await fetch(`${this.baseUrl}/answers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ questionId, answerText })
    });
    return response.json();
  }

  async deleteAnswer(questionId: number) {
    try {
      const response = await fetch(`${this.baseUrl}/answers/question/${questionId}`, {
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