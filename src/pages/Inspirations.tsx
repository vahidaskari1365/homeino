import { useState, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSavedInspirations } from "@/hooks/useSavedInspirations";
import { useInView } from "react-intersection-observer";
import { useContentHub, useContentTypes, type ContentHubFilters } from "@/hooks/useContentHub";
import ContentHubCard from "@/components/ContentHubCard";
import ContentHubFilters from "@/components/ContentHubFilters";
import ContentSEO from "@/components/ContentSEO";

const Inspirations = () => {
  const [search, setSearch] = useState("");
  const [activeContentType, setActiveContentType] = useState("all");
  const [activeStyle, setActiveStyle] = useState("all");
  const [activeRoomType, setActiveRoomType] = useState("all");
  const [sort, setSort] = useState<"newest" | "popular" | "trending">("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { saveInspiration, collections } = useSavedInspirations();
  const { ref, inView } = useInView();
  const { data: contentTypes } = useContentTypes();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters: ContentHubFilters = {
    contentType: activeContentType,
    style: activeStyle,
    roomType: activeRoomType,
    search: debouncedSearch,
    sort,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useContentHub(filters);

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap((page) => page) || [];
  const hasActiveFilters =
    activeContentType !== "all" ||
    activeStyle !== "all" ||
    activeRoomType !== "all" ||
    sort !== "newest" ||
    debouncedSearch !== "";

  const handleSave = (id: string) => {
    saveInspiration.mutate({ inspirationId: id });
  };

  const resetFilters = () => {
    setActiveContentType("all");
    setActiveStyle("all");
    setActiveRoomType("all");
    setSort("newest");
    setSearch("");
    setDebouncedSearch("");
  };

  return (
    <div className="min-h-screen bg-cream-dark">
      <ContentSEO isListing />
      <Navbar />

      <main className="container mx-auto px-6 py-24">
        <div className="flex flex-col gap-8 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
              مرکز محتوای هومینو
            </h1>
            <p className="text-muted-foreground mt-4 text-lg max-w-2xl">
              مرجع تخصصی دکوراسیون داخلی: از ایده‌های الهام‌بخش و راهنمای خرید تا آموزش‌های حرفه‌ای و
              پروژه‌های واقعی
            </p>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="جستجو در محتوا..."
              className="pr-10 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ContentHubFilters
            contentTypes={contentTypes || []}
            activeContentType={activeContentType}
            onContentTypeChange={setActiveContentType}
            activeStyle={activeStyle}
            onStyleChange={setActiveStyle}
            activeRoomType={activeRoomType}
            onRoomTypeChange={setActiveRoomType}
            sort={sort}
            onSortChange={setSort}
            onReset={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-[1.4rem] bg-card animate-pulse border border-border/50" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allItems.map((item) => {
                const isSaved = collections?.some((c) =>
                  c.items.some((i) => i.inspiration_id === item.id)
                );

                return (
                  <ContentHubCard
                    key={item.id}
                    item={item}
                    isSaved={isSaved}
                    onSave={handleSave}
                  />
                );
              })}
            </div>

            {hasNextPage && (
              <div ref={ref} className="py-12 flex justify-center">
                {isFetchingNextPage && <div className="loading-spinner" />}
              </div>
            )}

            {allItems.length === 0 && (
              <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border">
                <Search size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2">موردی یافت نشد</h3>
                <p className="text-muted-foreground">
                  با تغییر فیلترها یا جستجوی متفاوت، محتوای جدیدی پیدا کنید.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 text-primary font-semibold hover:underline"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Inspirations;
