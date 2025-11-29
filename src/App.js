import './App.css';
import React from "react";
import { Routes, Route } from "react-router-dom";
import PostPage from "./pages/PostPage";
import WordPressPostsFeed from "./components/WordPressPostsFeed";

function App() {
      return (
    <div className="app-container">
      <div className="content-wrapper">
        <Routes>
          <Route
            path="/"
            element={<WordPressPostsFeed site="ahundredleaves.wordpress.com" perPage={10} />}
          />
          <Route
            path="/post/:id/:slug?"
            element={<PostPage site="ahundredleaves.wordpress.com" />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
