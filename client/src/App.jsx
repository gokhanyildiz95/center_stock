import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Intake from './pages/Intake.jsx';
import Warehouse from './pages/Warehouse.jsx';
import Recipes from './pages/Recipes.jsx';
import Production from './pages/Production.jsx';
import Accounting from './pages/Accounting.jsx';
import Employees from './pages/Employees.jsx';

const NAV = [
  ['/', 'Panel'],
  ['/mal-girisi', 'Mal Girişi'],
  ['/depo', 'Depo'],
  ['/receteler', 'Reçeteler'],
  ['/uretim', 'Mutfak / Üretim'],
  ['/muhasebe', 'Muhasebe'],
  ['/calisanlar', 'Çalışanlar'],
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Center<span>Catering</span></div>
        <nav>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mal-girisi" element={<Intake />} />
          <Route path="/depo" element={<Warehouse />} />
          <Route path="/receteler" element={<Recipes />} />
          <Route path="/uretim" element={<Production />} />
          <Route path="/muhasebe" element={<Accounting />} />
          <Route path="/calisanlar" element={<Employees />} />
        </Routes>
      </main>
    </div>
  );
}
