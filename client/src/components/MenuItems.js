import MenuItemCard from "./MenuItemCard";
import { useState, useEffect } from "react";
import "../css/menuItem.css";
// import { AnimatePresence, motion } from "framer-motion";


function MenuItems({ restaurant, setCartId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [wrapChecked, setWrapChecked] = useState(false);
  const [plateChecked, setPlateChecked] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setMenuItems(restaurant.menu_items);
    }
	}, [restaurant]);
	console.log(restaurant)

  if (!menuItems) return <h1>...loading</h1>;

  const handleWrapChecked = (e) => {
    setWrapChecked(e.target.checked);
  };

  const handlePlateChecked = (e) => {
    setPlateChecked(e.target.checked);
  };

  const filteredMenuItems = () => {
    if (!wrapChecked && !plateChecked) {
      return menuItems;
    } else if (wrapChecked && plateChecked) {
      return menuItems;
    } else if (wrapChecked) {
      return menuItems.filter((mItem) => mItem.tag === "wrap");
    } else if (plateChecked) {
      return menuItems.filter((mItem) => mItem.tag === "plate");
    }
  };
  const mappedMenuItems = () => {
    return filteredMenuItems().map((mItem, index) => (
      <>
        <MenuItemCard setCartId={setCartId} key={mItem.id} mItem={mItem} />
        {index !== filteredMenuItems().length - 1 && (
          <div key={index} className="line"></div>
        )}
      </>
    ));
  };

  return (
    <div className="menu-container">
      <div className="menu-filter">
        <label>
          <input
            type="checkbox"
            checked={wrapChecked}
            onChange={handleWrapChecked}
          />
          Wraps
        </label>
        <label>
          <input
            type="checkbox"
            checked={plateChecked}
            onChange={handlePlateChecked}
          />
          Plates
        </label>
      </div>
      <div className="menuItems">
        <div className="dish-card">{mappedMenuItems()}</div>
      </div>
    </div>
  );
}

export default MenuItems;
