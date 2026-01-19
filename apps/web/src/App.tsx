import { Link } from 'react-router-dom';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Accounting Software</h1>
      <nav>
        <Link to="/accounting">Go to Accounting</Link>
      </nav>
    </div>
  );
}

export default App;
