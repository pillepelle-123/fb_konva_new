import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, Users, FileText, Plus, ArrowRight, Calendar } from 'lucide-react';

interface DashboardData {
  stats: {
    myBooks: number;
    contributedBooks: number;
    totalCollaborators: number;
  };
  recentBooks: {
    id: number;
    name: string;
    lastModified: string;
    collaboratorCount: number;
    isOwner: boolean;
  }[];
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your books today.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My Books</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.stats.myBooks || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Books I Contribute To</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.stats.contributedBooks || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Collaborators</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.stats.totalCollaborators || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Quickly access the most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link to="/books" className="flex-1 min-w-[200px]">
                <Button className="w-full h-auto py-4 px-6 justify-start space-x-3" variant="outline">
                  <Plus className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Create New Book</div>
                    <div className="text-sm text-muted-foreground">Start a new project</div>
                  </div>
                </Button>
              </Link>
              <Link to="/books" className="flex-1 min-w-[200px]">
                <Button className="w-full h-auto py-4 px-6 justify-start space-x-3" variant="outline">
                  <BookOpen className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">View All Books</div>
                    <div className="text-sm text-muted-foreground">Browse your library</div>
                  </div>
                </Button>
              </Link>
              <Button className="flex-1 min-w-[200px] h-auto py-4 px-6 justify-start space-x-3" variant="outline">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Manage Questions</div>
                  <div className="text-sm text-muted-foreground">Organize content</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Books */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Books</CardTitle>
              <CardDescription>
                Your most recently accessed books
              </CardDescription>
            </div>
            <Link to="/books">
              <Button variant="ghost" size="sm" className="space-x-2">
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentBooks.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <div>
                  <p className="text-muted-foreground font-medium">No books yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first book to get started!
                  </p>
                </div>
                <Link to="/books">
                  <Button className="space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Book</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData?.recentBooks.map(book => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{book.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Modified {formatDate(book.lastModified)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{book.collaboratorCount} collaborator{book.collaboratorCount !== 1 ? 's' : ''}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            book.isOwner 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {book.isOwner ? 'Owner' : 'Collaborator'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}