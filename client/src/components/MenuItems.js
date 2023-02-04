import MenuItemCard from "./MenuItemCard";
import { useState, useEffect } from "react";
import "../css/menuItem.css";
import ImageSlideshow from "./ImageSlideshow";
import { AnimatePresence, motion } from "framer-motion";
import {
	wrapImages,
	plateImages,
	saladImages,
	burgerImages,
	coldImages,
	grilledImages,
} from "./MenuImages";

function MenuItems({ restaurant, setCartId }) {
	const [menuItems, setMenuItems] = useState([]);
	const [filter, setFilter] = useState({
		wrap: false,
		plate: false,
		salad: false,
		burger: false,
		cold: false,
		grilled: false,
	});

	useEffect(() => {
		if (restaurant) {
			setMenuItems(restaurant.menu_items);
		}
	}, [restaurant]);
	console.log(restaurant);

	if (!menuItems) return <h1>...loading</h1>;

	const handleFilterChange = (name) => {
		setFilter((prevFilter) => ({
			...prevFilter,
			[name]: !prevFilter[name],
		}));
	};

	const filteredMenuItems = () => {
		const filters = Object.keys(filter).filter((key) => filter[key]);
		if (filters.length) {
			return menuItems.filter((mItem) => {
				return filters.includes(mItem.tag.toLowerCase());
			});
		} else {
			return menuItems;
		}
	};

	const mappedMenuItems = () => {
		let currentCategory = '';
		return filteredMenuItems().map(mItem => {
			if (mItem.tag !== currentCategory) {
				currentCategory = mItem.tag;
				switch (mItem.tag.toLowerCase()) {
					case 'wrap':
						return (
							<>
								<ImageSlideshow images={wrapImages} />
								<MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />
							</>
						);
					case 'plate':
						return (
							<>
								<ImageSlideshow images={plateImages} />
								<MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />
							</>
						);
					case 'salad':
						return (
							<>
								<ImageSlideshow images={saladImages} />
								<MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />
							</>
						);
					case 'burger':
						return (
							<>
								<ImageSlideshow images={burgerImages} />
								<MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />
							</>
						);
					case 'cold':
						return (
							<>
								<ImageSlideshow images={coldImages} />
								<MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />
							</>
						);
					case 'grilled':
						return (
							<>
								<ImageSlideshow images={grilledImages} />
								<MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />
							</>
						);
					default:
						return <MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />;
				}
			} else {
				return <MenuItemCard setCartId={setCartId} mItem={mItem} key={mItem.id} />;
			}
		});
	};
	
	return (
		<AnimatePresence>
			<motion.div
				initial={{ y: -100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: -100, opacity: 0 }}
				transition={{ duration: 0.5, ease: "easeInOut" }}
			>
				<div key={Math.random()*1000000} className="dish-card">
					<div className="menu-filter">
						<label>
							<input
								type="checkbox"
								checked={filter.wrap}
								onChange={() => handleFilterChange("wrap")}
							/>
							Wraps
						</label>
						<label>
							<input
								type="checkbox"
								checked={filter.plate}
								onChange={() => handleFilterChange("plate")}
							/>
							Plates
						</label>
						<label>
							<input
								type="checkbox"
								checked={filter.salad}
								onChange={() => handleFilterChange("salad")}
							/>
							Salads
						</label>
						<label>
							<input
								type="checkbox"
								checked={filter.burger}
								onChange={() => handleFilterChange("burger")}
							/>
							Burgers
						</label>
						<label>
							<input
								type="checkbox"
								checked={filter.cold}
								onChange={() => handleFilterChange("cold")}
							/>
							Cold Sandwiche's
						</label>
						<label>
							<input
								type="checkbox"
								checked={filter.grilled}
								onChange={() => handleFilterChange("grilled")}
							/>
							Grilled Sandwiche's
						</label>
					</div>
					<div className="menuItems">
						<div>{mappedMenuItems()}</div>
					</div>
				</div>{" "}
			</motion.div>
		</AnimatePresence>
	);
}

export default MenuItems;
