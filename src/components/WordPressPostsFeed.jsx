import React, { useEffect, useMemo, useRef, useState } from "react";

// Helper: strip HTML tags
function stripHtml(input) {
  if (!input) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = input;
  return (tmp.textContent || tmp.innerText || "").trim();
}

/**
 * Fetches and displays posts from a WordPress.com blog using the public REST API.
 * Supports pagination, search, featured images, categories, and tags.
 */
export default function WordPressPostsFeed({
  site = "ahundredleaves.wordpress.com",
  perPage = 10,
}) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const loadMoreRef = useRef(null);
  const abortRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Reset pagination when site or query changes
  useEffect(() => {
    setPosts([]);
    setPage(1);
    setTotalPages(null);
    setError(null);
  }, [site, qDebounced]);

  // Fetch posts
  useEffect(() => {
    let cancelled = false;

    async function fetchPage() {
      setLoading(true);
      setError(null);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({
        _embed: "1",
        orderby: "date",
        order: "desc",
        per_page: String(perPage),
        page: String(page),
        status: "publish",
      });
      if (qDebounced) params.set("search", qDebounced);

      const url = `https://public-api.wordpress.com/wp/v2/sites/${site}/posts?${params.toString()}`;

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.status === 404) throw new Error("Site not found or not a WordPress.com site.");
        if (!res.ok) {
          let reason = res.statusText;
          try {
            const j = await res.json();
            if (j?.message) reason = j.message;
          } catch {}
          throw new Error(`${res.status}: ${reason}`);
        }

        const data = await res.json();
        const totalPagesHeader = res.headers.get("X-WP-TotalPages");
        const tp = totalPagesHeader ? Number(totalPagesHeader) : null;

        if (!cancelled) {
          setTotalPages(tp);
          setPosts((prev) => (page === 1 ? data : [...prev, ...data]));
        }
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") {
          setError(err.message || "Failed to fetch posts.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPage();

    return () => {
      cancelled = true;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [site, page, perPage, qDebounced]);

  // Auto-load more when button visible
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const btn = loadMoreRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          if (!loading && (totalPages === null || page < (totalPages || 0))) {
            setPage((p) => p + 1);
          }
        }
      },
      { rootMargin: "200px 0px" }
    );

    io.observe(btn);
    return () => io.disconnect();
  }, [loading, totalPages, page]);

  const canLoadMore = useMemo(() => {
    if (totalPages == null) return true;
    return page < totalPages;
  }, [page, totalPages]);

  function getFeatured(post) {
    const media = post._embedded?.["wp:featuredmedia"];
    if (Array.isArray(media) && media[0]?.source_url) return media[0].source_url;
    return undefined;
  }

  function getTerms(post, taxonomy) {
    const groups = post._embedded?.["wp:term"];
    if (!groups) return [];
    const out = [];
    for (const group of groups) {
      for (const term of group) {
        if (term?.taxonomy === taxonomy && term?.name) out.push(term.name);
      }
    }
    return Array.from(new Set(out));
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WordPress Posts</h1>
          <p className="text-sm text-gray-500">Source: {site}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search posts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-72 rounded-xl border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Posts */}
      <div className="mt-6 flex flex-col gap-4">
        {posts.map((p) => {
          const featured = getFeatured(p);
          const cats = getTerms(p, "category");
          const tags = getTerms(p, "post_tag");
          return (
            <article key={p.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                {featured && (
                  <a href={p.link} target="_blank" rel="noreferrer" className="sm:w-48 sm:flex-none">
                    <img
                      alt={stripHtml(p.title?.rendered) || "Featured image"}
                      src={featured}
                      className="h-36 w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                  </a>
                )}
                <div className="flex-1">
                  <a href={p.link} target="_blank" rel="noreferrer" className="hover:underline">
                    <h2 className="text-lg font-semibold leading-snug">
                      {stripHtml(p.title?.rendered) || "(Untitled)"}
                    </h2>
                  </a>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(p.date).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-2 text-sm text-gray-700 line-clamp-4">
                    {stripHtml(p.excerpt?.rendered) || ""}
                  </p>

                  {(cats.length > 0 || tags.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {cats.map((c) => (
                        <span key={`c-${p.id}-${c}`} className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                          {c}
                        </span>
                      ))}
                      {tags.map((t) => (
                        <span key={`t-${p.id}-${t}`} className="rounded-full bg-gray-50 px-2 py-1 text-gray-500">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {/* Loading skeletons */}
        {loading && posts.length === 0 && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border bg-white p-4 shadow-sm">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-1/3 rounded bg-gray-200" />
                <div className="mt-4 h-16 w-full rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      <div className="mt-6 flex items-center justify-center">
        <button
          ref={loadMoreRef}
          onClick={() => canLoadMore && setPage((p) => p + 1)}
          disabled={!canLoadMore || loading}
          className="rounded-full border px-4 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && posts.length > 0
            ? "Loading…"
            : canLoadMore
            ? "Load more"
            : "No more posts"}
        </button>
      </div>
    </div>
  );
}

