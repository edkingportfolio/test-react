// src/pages/PostPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./PostPage.css";

export default function PostPage({ site }) {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://public-api.wordpress.com/wp/v2/sites/${site}/posts/${id}?_embed=1`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Failed to load post: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setPost(data);
          document.title =
            (data.title?.rendered?.replace(/<[^>]+>/g, "") || "Post") + " – " + site;
        }
      } catch (e) {
        if (!cancelled && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; controller.abort(); };
  }, [id, site]);

  if (loading) return <div className="postpage-container">Loading…</div>;
  if (error)   return <div className="postpage-container error">{error}</div>;
  if (!post)   return <div className="postpage-container">Not found.</div>;

  const featured = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

  return (
    <div className="postpage-container">
      <Link to="/" className="back-link">← Back to posts</Link>

      <h1
        className="postpage-title"
        dangerouslySetInnerHTML={{ __html: post.title?.rendered || "" }}
      />
      <p className="postpage-date">
        {new Date(post.date).toLocaleDateString(undefined, {
          year: "numeric", month: "long", day: "numeric",
        })}
      </p>

      {featured && <img className="postpage-hero" src={featured} alt="" />}

      <div
        className="postpage-body"
        dangerouslySetInnerHTML={{ __html: post.content?.rendered || "" }}
      />
    </div>
  );
}

