import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ContractProvider } from './context/ContractContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header/Header';
import Footer from './components/common/Footer';
import { UserInfoWidget } from './components/common/UserInfoWidget/UserInfoWidget';
import { Home } from './pages/Home';
import { Plans } from './pages/Plans';
import { MyDeposits } from './pages/MyDeposits/MyDeposits';
import { Calculator } from './pages/Calculator/Calculator';
import { Admin } from './pages/Admin/AdminDashboard';
import './App.css';
import './styles/global.scss';
import './styles/themes.scss';

function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <ContractProvider>
          <BrowserRouter>
            <div className="app">
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/my-deposits" element={<MyDeposits />} />
                  <Route path="/calculator" element={<Calculator />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </main>
              <Footer />
              <UserInfoWidget />
            </div>
          </BrowserRouter>
        </ContractProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
