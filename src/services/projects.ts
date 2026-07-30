export interface SavedProject {
  id: string;
  title: string;
  originalImage: string;
  generatedImage: string;
  style: string;
  prompt: string;
  roomTip: string | null;
  selectedProducts: Record<string, {
    id: string;
    name: string;
    price: number | null;
    image_url: string | null;
    category_id: string | null;
  }>;
  budget: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "homeino_projects";

export function getProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedProject[];
  } catch {
    return [];
  }
}

export function saveProject(project: SavedProject): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string): SavedProject | undefined {
  return getProjects().find((p) => p.id === id);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}