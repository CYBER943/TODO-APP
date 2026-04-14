export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  createdAt: string;
  projectId: string;
  tags: string[];
  subtasks: SubTask[];
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
  attachments?: {
    name: string;
    url: string;
  }[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface AppState {
  tasks: Task[];
  projects: Project[];
  theme: 'light' | 'dark' | 'system';
  selectedProjectId: string; // 'all', 'today', 'upcoming', or project UUID
}
