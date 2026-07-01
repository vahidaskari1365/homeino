import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FolderOpen, Trash2, Clock, ArrowLeft, Palette, Sparkles, Image as ImageIcon, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getProjects, deleteProject, SavedProject } from "@/services/projects";

const Projects = () => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deleteProject(id);
    setProjects(getProjects());
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 text-sm transition-colors"
            >
              <ArrowLeft size={16} /> بازگشت به خانه
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
              پروژه‌های طراحی من
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              طرح‌های هوش مصنوعی خود را مدیریت کنید و ادامه دهید.
            </p>
          </div>
          <Link
            to="/ai-design"
            className="gradient-gold text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-luxury shrink-0"
          >
            <Sparkles size={18} />
            طراحی جدید
          </Link>
        </div>

        {/* Projects Grid or Empty State */}
        {projects.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl py-24 px-6 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
              <FolderOpen size={44} className="text-accent/60" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              هنوز پروژه‌ای ذخیره نکرده‌اید
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              اولین طراحی هوش مصنوعی خود را انجام دهید و آن‌ها را اینجا ذخیره کنید تا بعداً به راحتی ادامه دهید.
            </p>
            <Link
              to="/ai-design"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 rounded-xl font-bold transition-all"
            >
              <Plus size={20} />
              شروع طراحی جدید
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/ai-design?project=${project.id}`)}
                className="group relative bg-card border border-border/50 rounded-2xl overflow-hidden text-right shadow-card hover:shadow-luxury hover:border-accent/30 transition-all duration-500 hover:-translate-y-1"
              >
                {/* Images */}
                <div className="relative flex">
                  {/* Original image */}
                  <div className="w-1/2 aspect-square relative overflow-hidden">
                    <img
                      src={project.originalImage}
                      alt="تصویر اصلی"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute bottom-2 right-2">
                      <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <ImageIcon size={10} /> قبل
                      </span>
                    </div>
                  </div>
                  {/* Generated image */}
                  <div className="w-1/2 aspect-square relative overflow-hidden">
                    {project.generatedImage ? (
                      <img
                        src={project.generatedImage}
                        alt="تصویر طراحی شده"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-accent/5 flex items-center justify-center">
                        <Palette size={32} className="text-accent/30" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[10px] bg-accent/80 text-accent-foreground px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <Sparkles size={10} /> بعد
                      </span>
                    </div>
                  </div>
                  {/* Divider line */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center shadow-lg">
                    <Palette size={14} className="text-accent" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-foreground text-sm mb-2 line-clamp-1">
                    {project.title || "طراحی بدون عنوان"}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock size={12} />
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                  {project.style && (
                    <div className="mt-2">
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        {project.style}
                      </span>
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 z-10"
                  title="حذف پروژه"
                >
                  <Trash2 size={14} />
                </button>

                {/* Continue editing badge */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <span className="text-[10px] bg-accent text-accent-foreground px-3 py-1 rounded-full font-bold backdrop-blur-sm shadow-lg">
                    ادامه طراحی
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Project count */}
        {projects.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat("fa-IR").format(projects.length)}{" "}
              پروژه ذخیره شده
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Projects;