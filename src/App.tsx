import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Inbox, 
  Star, 
  Clock, 
  CheckCircle2, 
  Settings, 
  Menu, 
  X, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  ChevronDown, 
  Tag, 
  Flag, 
  BarChart3, 
  Moon, 
  Sun,
  Mic,
  Sparkles,
  Link as LinkIcon,
  Paperclip,
  LayoutGrid,
  ListTodo,
  User,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isAfter, isPast, addDays, startOfToday, endOfToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Task, Project, Priority } from './types';
import { GoogleGenAI } from '@google/genai';

const PRIORITY_COLORS = {
  low: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
  medium: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  high: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30',
  urgent: 'text-red-500 bg-red-50 dark:bg-red-950/30',
};

const DEFAULT_PROJECTS: Project[] = [
  { id: 'inbox', name: 'Inbox', color: '#7c3aed', icon: 'Inbox' },
  { id: 'personal', name: 'Personal', color: '#0ea5e9', icon: 'User' },
  { id: 'work', name: 'Work', color: '#f59e0b', icon: 'Briefcase' },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // AI Suggestions State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Load data from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('zentask_tasks');
    const savedProjects = localStorage.getItem('zentask_projects');
    const savedTheme = localStorage.getItem('zentask_theme');

    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('zentask_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('zentask_projects', JSON.stringify(projects));
  }, [projects]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zentask_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zentask_theme', 'light');
    }
  };

  const addTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      completed: false,
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate,
      createdAt: new Date().toISOString(),
      projectId: taskData.projectId || 'inbox',
      tags: taskData.tags || [],
      subtasks: [],
      ...taskData
    };
    setTasks([newTask, ...tasks]);
    toast.success('Task added successfully');
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.info('Task deleted');
  };

  const toggleTaskCompletion = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTask(id, { completed: !task.completed });
      if (!task.completed) {
        toast.success('Task completed! Great job.');
      }
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by project/view
    if (selectedProjectId === 'today') {
      result = result.filter(t => t.dueDate && isToday(new Date(t.dueDate)));
    } else if (selectedProjectId === 'upcoming') {
      result = result.filter(t => t.dueDate && isAfter(new Date(t.dueDate), endOfToday()));
    } else if (selectedProjectId === 'completed') {
      result = result.filter(t => t.completed);
    } else if (selectedProjectId === 'overdue') {
      result = result.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && !t.completed);
    } else if (selectedProjectId !== 'all') {
      result = result.filter(t => t.projectId === selectedProjectId);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description?.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) => {
      // Sort by completion first
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // Then by priority
      const priorityMap = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (priorityMap[a.priority] !== priorityMap[b.priority]) {
        return priorityMap[a.priority] - priorityMap[b.priority];
      }
      // Then by date
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, selectedProjectId, searchQuery]);

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Last 7 days data
    const last7Days = eachDayOfInterval({
      start: addDays(new Date(), -6),
      end: new Date()
    }).map(date => {
      const dayStr = format(date, 'MMM dd');
      const count = tasks.filter(t => t.completed && format(new Date(t.createdAt), 'MMM dd') === dayStr).length;
      return { name: dayStr, completed: count };
    });

    return { completed, total, completionRate, last7Days };
  }, [tasks]);

  const getAiSuggestions = async () => {
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = 'gemini-3-flash-preview';
      const prompt = `Based on these current tasks: ${tasks.map(t => t.title).join(', ')}. Suggest 3 next logical tasks to improve productivity. Return only a JSON array of strings.`;
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const suggestions = JSON.parse(response.text || '[]');
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('AI Suggestion Error:', error);
      setAiSuggestions(['Organize workspace', 'Review weekly goals', 'Plan tomorrow\'s top 3 tasks']);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("flex h-screen bg-background text-foreground transition-colors duration-300", isDarkMode && "dark")}>
        <Toaster position="top-right" />
        
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="w-64 border-r bg-muted/30 flex flex-col hidden md:flex"
            >
              <SidebarContent 
                projects={projects} 
                selectedProjectId={selectedProjectId} 
                setSelectedProjectId={setSelectedProjectId}
                setProjects={setProjects}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile Sidebar */}
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="md:hidden absolute top-4 left-4 z-50">
              <Menu className="h-5 w-5" />
            </Button>
          } />
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent 
              projects={projects} 
              selectedProjectId={selectedProjectId} 
              setSelectedProjectId={setSelectedProjectId}
              setProjects={setProjects}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="h-16 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold tracking-tight">
                {selectedProjectId === 'all' ? 'All Tasks' : 
                 selectedProjectId === 'today' ? 'Today' :
                 selectedProjectId === 'upcoming' ? 'Upcoming' :
                 selectedProjectId === 'completed' ? 'Completed' :
                 selectedProjectId === 'overdue' ? 'Overdue' :
                 projects.find(p => p.id === selectedProjectId)?.name || 'Tasks'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tasks..."
                  className="pl-9 w-64 bg-muted/50 border-none focus-visible:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Content Area */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
              <Tabs defaultValue="list" className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="list" className="gap-2">
                      <ListTodo className="h-4 w-4" /> List
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="gap-2">
                      <CalendarIcon className="h-4 w-4" /> Calendar
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                      <BarChart3 className="h-4 w-4" /> Analytics
                    </TabsTrigger>
                  </TabsList>

                  <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                    <DialogTrigger render={
                      <Button className="gap-2 shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4" /> Add Task
                      </Button>
                    } />
                    <TaskFormDialog 
                      onSave={(data) => {
                        if (editingTask) {
                          updateTask(editingTask.id, data);
                          setEditingTask(null);
                        } else {
                          addTask(data);
                        }
                        setIsTaskDialogOpen(false);
                      }}
                      initialData={editingTask || undefined}
                      projects={projects}
                    />
                  </Dialog>
                </div>

                <TabsContent value="list" className="mt-0 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onToggle={() => toggleTaskCompletion(task.id)}
                          onDelete={() => deleteTask(task.id)}
                          onEdit={() => {
                            setEditingTask(task);
                            setIsTaskDialogOpen(true);
                          }}
                        />
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center space-y-4"
                      >
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">All caught up!</h3>
                          <p className="text-muted-foreground">No tasks found for this view.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>

                <TabsContent value="calendar" className="mt-0">
                  <Card className="border-none bg-muted/30">
                    <CardContent className="p-6">
                      <Calendar 
                        mode="single"
                        className="rounded-md border shadow bg-background mx-auto"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/10">
                      <CardHeader className="pb-2">
                        <CardDescription>Completion Rate</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.completionRate}%</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="bg-green-500/5 border-green-500/10">
                      <CardHeader className="pb-2">
                        <CardDescription>Completed Tasks</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.completed}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card className="bg-blue-500/5 border-blue-500/10">
                      <CardHeader className="pb-2">
                        <CardDescription>Total Tasks</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Productivity</CardTitle>
                      <CardDescription>Tasks completed over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.last7Days}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                            itemStyle={{ color: 'hsl(var(--primary))' }}
                          />
                          <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* AI Suggestions Section */}
              <section className="pt-8 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">AI Task Suggestions</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={getAiSuggestions} disabled={isAiLoading}>
                    {isAiLoading ? 'Thinking...' : 'Get Suggestions'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {aiSuggestions.length > 0 ? (
                    aiSuggestions.map((suggestion, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card 
                          className="cursor-pointer hover:border-primary/50 transition-colors group"
                          onClick={() => addTask({ title: suggestion })}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium">{suggestion}</span>
                            <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-muted/30 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-xs">
                        Click to generate
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>

          {/* Quick Add Floating Button (Mobile) */}
          <Button 
            className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50"
            onClick={() => setIsTaskDialogOpen(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </main>
      </div>
    </TooltipProvider>
  );
}

function SidebarContent({ projects, selectedProjectId, setSelectedProjectId, setProjects }: { 
  projects: Project[], 
  selectedProjectId: string, 
  setSelectedProjectId: (id: string) => void,
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
}) {
  return (
    <div className="flex flex-col h-full py-6">
      <div className="px-6 mb-8 flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <span className="font-bold text-xl tracking-tight">ZenTask</span>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6">
          <div>
            <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</h3>
            <div className="space-y-1">
              <SidebarItem 
                icon={<Inbox className="h-4 w-4" />} 
                label="All Tasks" 
                active={selectedProjectId === 'all'} 
                onClick={() => setSelectedProjectId('all')} 
              />
              <SidebarItem 
                icon={<Star className="h-4 w-4 text-yellow-500" />} 
                label="Today" 
                active={selectedProjectId === 'today'} 
                onClick={() => setSelectedProjectId('today')} 
              />
              <SidebarItem 
                icon={<CalendarIcon className="h-4 w-4 text-blue-500" />} 
                label="Upcoming" 
                active={selectedProjectId === 'upcoming'} 
                onClick={() => setSelectedProjectId('upcoming')} 
              />
              <SidebarItem 
                icon={<Clock className="h-4 w-4 text-red-500" />} 
                label="Overdue" 
                active={selectedProjectId === 'overdue'} 
                onClick={() => setSelectedProjectId('overdue')} 
              />
              <SidebarItem 
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} 
                label="Completed" 
                active={selectedProjectId === 'completed'} 
                onClick={() => setSelectedProjectId('completed')} 
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</h3>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => {
                const name = prompt('Project Name:');
                if (name) {
                  setProjects([...projects, { id: crypto.randomUUID(), name, color: '#'+Math.floor(Math.random()*16777215).toString(16) }]);
                }
              }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {projects.map(project => (
                <SidebarItem 
                  key={project.id}
                  icon={project.icon === 'Inbox' ? <Inbox className="h-4 w-4" /> : project.icon === 'User' ? <User className="h-4 w-4" /> : project.icon === 'Briefcase' ? <Briefcase className="h-4 w-4" /> : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />} 
                  label={project.name} 
                  active={selectedProjectId === project.id} 
                  onClick={() => setSelectedProjectId(project.id)} 
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="px-4 pt-4 border-t">
        <Card className="bg-primary/5 border-none">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Daily Goal</span>
              <span>75%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary w-3/4" />
            </div>
            <p className="text-[10px] text-muted-foreground">3 more tasks to reach your goal!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, key?: string }) {
  return (
    <Button 
      variant={active ? "secondary" : "ghost"} 
      className={cn(
        "w-full justify-start gap-3 px-2 h-9 font-normal transition-all duration-200",
        active && "bg-primary/10 text-primary hover:bg-primary/15"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  );
}

function TaskItem({ task, onToggle, onDelete, onEdit }: { task: Task, onToggle: () => void, onDelete: () => void, onEdit: () => void, key?: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group flex items-start gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200",
        task.completed && "opacity-60 grayscale-[0.5]"
      )}
    >
      <Checkbox 
        checked={task.completed} 
        onCheckedChange={onToggle}
        className="mt-1 h-5 w-5 rounded-full border-2"
      />
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-medium text-sm sm:text-base truncate",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h3>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !task.completed 
                ? "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400" 
                : "bg-muted text-muted-foreground"
            )}>
              <CalendarIcon className="h-3 w-3" />
              {isToday(new Date(task.dueDate)) ? 'Today' : format(new Date(task.dueDate), 'MMM dd')}
            </div>
          )}
          
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border-none capitalize", PRIORITY_COLORS[task.priority])}>
            <Flag className="h-2.5 w-2.5 mr-1 fill-current" />
            {task.priority}
          </Badge>

          {task.tags.map(tag => (
            <div key={tag} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TaskFormDialog({ onSave, initialData, projects }: { 
  onSave: (data: Partial<Task>) => void, 
  initialData?: Task,
  projects: Project[]
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'medium');
  const [projectId, setProjectId] = useState(initialData?.projectId || 'inbox');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.dueDate ? new Date(initialData.dueDate) : undefined);
  const [tags, setTags] = useState<string>(initialData?.tags.join(', ') || '');

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Task' : 'Create New Task'}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Input 
            placeholder="What needs to be done?" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium border-none px-0 focus-visible:ring-0"
            autoFocus
          />
          <Textarea 
            placeholder="Add description..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none border-none px-0 focus-visible:ring-0 min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</label>
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              } />
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Tags</label>
            <Input 
              placeholder="work, urgent, home" 
              value={tags} 
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onSave({})}>Cancel</Button>
        <Button onClick={() => onSave({
          title,
          description,
          priority,
          projectId,
          dueDate: dueDate?.toISOString(),
          tags: tags.split(',').map(t => t.trim()).filter(t => t !== '')
        })}>
          {initialData ? 'Update Task' : 'Create Task'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
