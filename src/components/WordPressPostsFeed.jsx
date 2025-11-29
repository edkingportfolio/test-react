import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./WordPressPostsFeed.css";

function stripHtml(input) {
  if (!input) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = input;
  return (tmp.textContent || tmp.innerText || "").trim();
}

export default function WordPressPostsFeed({
  site = "ahundredleaves.wordpress.com",
  perPage = 10,
}) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchPosts() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://public-api.wordpress.com/wp/v2/sites/${site}/posts?per_page=${perPage}&page=${page}&_embed`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to load posts");
        const data = await res.json();
        const total = res.headers.get("X-WP-TotalPages");
        setPosts((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalPages(Number(total));
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
    return () => controller.abort();
  }, [page, site, perPage]);

  const canLoadMore = useMemo(
    () => totalPages == null || page < totalPages,
    [page, totalPages]
  );

  return (
    <div className="feed-container">
      <h2 className="feed-title">WordPress Posts</h2>
      <p className="feed-subtitle">Source: {site}</p>

      {error && <div className="error">{error}</div>}

      <div className="posts-list">
      {posts.map((p) => {
          const media = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
          const to = `/post/${p.id}/${p.slug || ""}`;
          return (
              <article key={p.id} className="post">
              {media && (
                  <Link to={to} className="post-image-link">
                  <img src={media} alt="" className="post-image" />
                  </Link>
              )}
              <div className="post-content">
              <Link to={to} className="post-title-link">
              <h3 className="post-title">
              {stripHtml(p.title?.rendered) || "(Untitled)"}
              </h3>
              </Link>
              <p className="post-date">
              {new Date(p.date).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
              })}
              </p>
              <p className="post-excerpt">{stripHtml(p.excerpt?.rendered) || ""}</p>
              </div>
              </article>
          );
      })}
      </div>

      {canLoadMore && (
          <button
          ref={loadMoreRef}
          onClick={() => setPage((p) => p + 1)}
          disabled={loading}
          className="load-more"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
