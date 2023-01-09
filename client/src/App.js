import { useEffect, useState } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom"
import './App.css';

function App() {
  const [currentUser, setCurrentUser] =useState(null)

  useEffect(() => {
		fetch("/auth").then((r) => {
			if (r.ok) {
				r.json().then((user) => setCurrentUser(user));
			}
		});
	}, []);
  return (
    <div className="App">
     
    </div>
  );
}

export default App;
