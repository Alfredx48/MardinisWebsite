import MenuItemCard from "./MenuItemCard";
import { useState, useEffect } from "react";
import "../css/menuItem.css";
import ImageSlideshow from "./ImageSlideshow";
import { AnimatePresence, motion } from "framer-motion";
// import { AnimatePresence, motion } from "framer-motion";

function MenuItems({ restaurant, setCartId }) {
	const [menuItems, setMenuItems] = useState([]);
	const [wrapChecked, setWrapChecked] = useState(false);
	const [plateChecked, setPlateChecked] = useState(false);
	const wrapImages = [
		"https://s3-media0.fl.yelpcdn.com/bphoto/-yKYMrCbJcmSrdf-Depflg/o.jpg",
		"https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/aa0f5392-92bb-4907-8f31-2273e7e7d246-retina-large.JPG",
		"https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/f4c56adf-203b-43bd-aa73-cf85958a5de2-retina-large.JPG",
	];
	const plateImages = [
		"https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/4571368f-9e1c-4bbb-814b-1c02e0129e3a-retina-large.jpg",
		"https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/f54fca12-8ab9-4c19-a263-dc7c0a03a901-retina-large.jpg",
		"https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/5fff8497-90c2-4a4f-9fc7-c06d79ec1016-retina-large.jpg",
	];

	useEffect(() => {
		if (restaurant) {
			setMenuItems(restaurant.menu_items);
		}
	}, [restaurant]);
	console.log(restaurant);

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
		let isWrap = false;
		let isPlate = false;
		return filteredMenuItems().map((mItem) => {
			if (mItem.tag === "wrap" && !isWrap) {
				isWrap = true;

				return (
					<>
						<ImageSlideshow images={wrapImages} />
						<div className="menu-title">
							<h1> Wraps </h1>
						</div>
					</>
				);
			} else if (mItem.tag === "plate" && !isPlate) {
				isPlate = true;
				return (
					<>
						<ImageSlideshow images={plateImages} />
						<div className="menu-title">
							<h1> Plates </h1>
						</div>
					</>
				);
			} else {
				return (
					<MenuItemCard key={mItem.id} setCartId={setCartId} mItem={mItem} />
				);
			}
		});
	};

	return (
		<AnimatePresence>
			<motion.div
				// key={mItem.id}
				initial={{ y: -100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: -100, opacity: 0 }}
				transition={{ duration: 0.5, ease: "easeInOut" }}
			>
				<div className="dish-card">
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
						<div>{mappedMenuItems()}</div>
					</div>
				</div>
				{" "}
			</motion.div>
		</AnimatePresence>
	);
}

export default MenuItems;
