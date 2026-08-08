import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Items from "./pages/Items";
import ItemDetails from "./pages/ItemDetails";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Categories from "./pages/Categories";
import CategoryItems from "./pages/CategoryItems";
import Watchlist from "./pages/Watchlist";
import SellItem from "./pages/SellItem";
import MyItems from "./pages/MyItems";
import EditItem from "./pages/EditItem";


function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetails />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:id" element={<CategoryItems />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/sell" element={<SellItem />} />
        <Route path="/my-items" element={<MyItems />} />
        <Route path="/my-items/:id/edit" element={<EditItem />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
