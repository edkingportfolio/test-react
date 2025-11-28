import './App.css';
import WordPressPostsFeed from "./components/WordPressPostsFeed";

function App() {
  return (
    <div className="App">
      <header className="App-header">
      Coffee Break Reads
      </header>
      <WordPressPostsFeed site="ahundredleaves.wordpress.com" perPage={10} />
    </div>
  );
}

export default App;
