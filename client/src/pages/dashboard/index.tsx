import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/composites/card';
import { BookOpen, Users, FileText, Plus, ArrowRight, Calendar, MessageSquare, HelpCircle, TrendingUp, Activity, Mail, Star, BookPlus, MessageCircleQuestionMark, LayoutDashboard } from 'lucide-react';
import FloatingActionButton from '../../components/ui/composites/floating-action-button';
import { ChartContainer } from '../../components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import ProfilePicture from '../../components/features/users/profile-picture';

interface DashboardData {
  stats: {
    myBooks: number;
    contributedBooks: number;
    totalCollaborators: number;
    totalQuestions: number;
    totalAnswers: number;
    totalFriends: number;
    weeklyActivity: number;
  };
  recentBooks: {
    id: number;
    name: string;
    lastModified: string;
    collaboratorCount: number;
    isOwner: boolean;
  }[];
  activityData: {
    day: string;
    books: number;
    questions: number;
    answers: number;
  }[];
  bookStats: {
    name: string;
    pages: number;
    color: string;
  }[];
  messages: {
    id: number;
    sender: string;
    avatar: string;
    message: string;
    time: string;
    unread: boolean;
    profile_picture_32?: string;
    user_id?: number;
  }[];
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getCachedData = () => {
    const cached = localStorage.getItem('dashboard-data');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
        return data;
      }
    }
    return null;
  };

  const setCachedData = (data: DashboardData) => {
    localStorage.setItem('dashboard-data', JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  };

  const fetchDashboardData = async () => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setDashboardData(cachedData);
      setLoading(false);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      // Single API call for all dashboard data
      const response = await fetch(`${apiUrl}/dashboard/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const data = await response.json();
      
      const dashboardData = {
        stats: data.stats || {
          myBooks: 0,
          contributedBooks: 0,
          totalCollaborators: 0,
          totalQuestions: 0,
          totalAnswers: 0,
          totalFriends: 0,
          weeklyActivity: 0
        },
        recentBooks: data.recentBooks || [],
        activityData: data.activityData || [],
        bookStats: [
          { name: "Completed", pages: data.stats?.completedPages || 0, color: "hsl(var(--highlight))" },
          { name: "In Progress", pages: data.stats?.inProgressPages || 0, color: "hsl(var(--primary))" },
          { name: "Draft", pages: data.stats?.draftPages || 0, color: "hsl(var(--muted-foreground))" }
        ],
        messages: (data.messages || []).slice(0, 3).map((msg: any) => ({
          id: msg.id,
          sender: msg.sender_name,
          avatar: msg.sender_name.split(' ').map((n: string) => n[0]).join(''),
          message: msg.content,
          time: formatTimeAgo(msg.created_at),
          unread: !msg.read_at,
          profile_picture_32: msg.profile_picture_32,
          user_id: msg.user_id
        }))
      };
      
      setDashboardData(dashboardData);
      setCachedData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData({
        stats: { myBooks: 0, contributedBooks: 0, totalCollaborators: 0, totalQuestions: 0, totalAnswers: 0, totalFriends: 0, weeklyActivity: 0 },
        recentBooks: [],
        activityData: [],
        bookStats: [],
        messages: []
      });
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
  
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
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
    <div className="container mx-auto px-4 py-4">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-2">
              <LayoutDashboard/>
              <span>Welcome back, {user?.name}!</span>
            </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your books today.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-highlight">
                  <BookOpen className="h-6 w-6 text-primary-foreground" />
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
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                  <HelpCircle className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Questions</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.stats.totalQuestions || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted-foreground">
                  <MessageSquare className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Answers</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.stats.totalAnswers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ring">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Friends</p>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.stats.totalFriends || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Monthly Activity</span>
              </CardTitle>
              <CardDescription>Your activity over the past four weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                <BarChart data={dashboardData?.activityData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="books" fill="hsl(var(--highlight))" name="Books" />
                  <Bar dataKey="questions" fill="hsl(var(--primary))" name="Questions" />
                  <Bar dataKey="answers" fill="hsl(var(--muted-foreground))" name="Answers" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Book Progress</span>
              </CardTitle>
              <CardDescription>Distribution of your book pages</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                <PieChart>
                  <Pie
                    data={dashboardData?.bookStats || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="pages"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dashboardData?.bookStats?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Messages and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Recent Messages</span>
                </CardTitle>
                <CardDescription>Latest messages from your collaborators</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.messages?.map(message => (
                  <div key={message.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-muted/50">
                    <ProfilePicture 
                      name={message.sender}
                      size="sm"
                      userId={message.user_id}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{message.sender}</p>
                        <p className="text-xs text-muted-foreground">{message.time}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{message.message}</p>
                    </div>
                    {message.unread && (
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-highlight" />
                  <span className="text-sm font-medium">Contributed Books</span>
                </div>
                <span className="text-lg font-bold">{dashboardData?.stats.contributedBooks || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-ring" />
                  <span className="text-sm font-medium">Collaborators</span>
                </div>
                <span className="text-lg font-bold">{dashboardData?.stats.totalCollaborators || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium">Weekly Activity</span>
                </div>
                <span className="text-lg font-bold">{dashboardData?.stats.weeklyActivity || 0}%</span>
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
              <Button
                onClick={() => navigate('/books/create')}
                className="flex-1 min-w-[200px] w-full h-auto py-4 px-6 justify-start space-x-3"
                variant="outline"
              >
                <BookPlus className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Create New Book</div>
                  <div className="text-sm text-muted-foreground">Start a new project</div>
                </div>
              </Button>
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
                <MessageCircleQuestionMark className="h-5 w-5" />
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
                    <span>Create a Book</span>
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
      
      <FloatingActionButton />
      
    </div>
  );
}