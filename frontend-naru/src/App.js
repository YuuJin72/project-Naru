import { GlobalStyles } from "./components/common/styles/GlobalStyles"
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from "./components/layout/header/Header"
import Footer from "./components/layout/footer/Footer"
import Nav01 from './components/layout/navigation/Nav01';
import Nav02 from './components/layout/navigation/Nav02';
import Nav03 from './components/layout/navigation/Nav03';
import MainBanner from './components/layout/banner/Banner01';
import { CommunityBanner, PointBanner, QnaBanner } from "./components/layout/banner/Banner03"
import Cafe from './pages/Cafe';
import SignIn from "./pages/signIn/SignIn";
import SignUp from './pages/signUp/signUp';
import ExploreLayout from './components/layout/ExploreLayout';
import Layout from './components/layout/Layout';
import MypageLayout from './components/layout/MypageLayout';


function App() {
  return (
    <BrowserRouter>
      <GlobalStyles />
      <Header category={<Nav01 />} logout={<Nav02 />} login={<Nav03 />} />
      <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MainBanner />} />
            <Route path="community/*" element={<CommunityBanner />} />
            <Route path="point" element={<PointBanner />} />
            <Route path="qna" element={<QnaBanner />} />
            <Route path="signIn" element={<SignIn />} />
            <Route path="signUp" element={<SignUp />} />
          </Route>

          <Route path="explore/*" element={<ExploreLayout />}>
            <Route path="cafe" element={<Cafe />} />
            <Route path="entertainment" element={<Cafe />} />
            <Route path="culture" element={<Cafe />} />
          </Route>

          <Route path="mypage/*" element={<MypageLayout />}>
            <Route index element={<Cafe />} />
          </Route>
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
