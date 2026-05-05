import { Link } from 'react-router-dom';
export default function Dashboard() {
  return <div className="p-page text-text-primary">Dashboard - <Link to="/recipes">Recipes</Link> - <Link to="/profile">Profile</Link></div>;
}
