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
	const [saladChecked, setSaladChecked] = useState(false);
	const [burgerChecked, setBurgerChecked] = useState(false);
	const [grilledChecked, setGrilledChecked] = useState(false);
	const [coldChecked, setColdChecked] = useState(false);

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
	const saladImages = [
		"https://s3-media0.fl.yelpcdn.com/bphoto/uo6yp14nufctYoLsXHcMQg/348s.jpg",
		"https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photos/c5b85f90-972e-4c18-ab6d-a994e6706d54-retina-large.jpg",
		"https://s3-media0.fl.yelpcdn.com/bphoto/xqhbv5Q5cwWK-qNwGrQG4g/348s.jpg",
	];
	const burgerImages = [
		"https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photos/9679bae4-5b41-413a-82c9-1c3bd67df316-retina-large.jpg",
		"https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photosV2/bda8f721-c947-4dd7-ad19-8f6fae0ef3f7-retina-large.JPG",
		"https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photosV2/6e7fed47-e9d8-492e-a3aa-c51e0266fc7d-retina-large.JPG",
	];
	const grilledImages = [
		"https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photosV2/b7eb0886-beca-4932-8c1c-c77f5488eee2-retina-large.JPG",
		"https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photosV2/9c24b770-fc36-443b-ba2b-53ba531f0494-retina-large.JPG",
		"https://s3-media0.fl.yelpcdn.com/bphoto/r3zzugOYwIg4i9lpKcNX1Q/o.jpg",
	];
	const coldImages = [
		"https://s3-media0.fl.yelpcdn.com/bphoto/cdx63NSFDK_Kv9q7VgB8Mw/348s.jpg",
		"https://s3-media0.fl.yelpcdn.com/bphoto/SYmfFqWFEDC7bARQ0ZB3ZQ/o.jpg",
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
	const handleSaladChecked = (e) => {
		setSaladChecked(e.target.checked);
	};
	const handleBurgerChecked = (e) => {
		setBurgerChecked(e.target.checked);
	};
	const handleColdChecked = (e) => {
		setColdChecked(e.target.checked);
	};
	const handleGrilledChecked = (e) => {
		setGrilledChecked(e.target.checked);
	};

	const filteredMenuItems = () => {
		if (
			wrapChecked ||
			plateChecked ||
			saladChecked ||
			burgerChecked ||
			coldChecked ||
			grilledChecked
		) {
			return menuItems.filter((mItem) => {
				if (wrapChecked && mItem.tag === "wrap") return true;
				if (plateChecked && mItem.tag === "plate") return true;
				if (saladChecked && mItem.tag === "salad") return true;
				if (burgerChecked && mItem.tag === "burger") return true;
				if (coldChecked && mItem.tag === "cold sandwich") return true;
				if (grilledChecked && mItem.tag === "grilled sandwich") return true;
				return false;
			});
		} else {
			return menuItems;
		}
	};

	const mappedMenuItems = () => {
		let isWrap = false;
		let isPlate = false;
		let isSalad = false;
		let isBurger = false;
		let isColdSandwich = false;
		let isGrilledSandwich = false;
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
			} else if (mItem.tag === "salad" && !isSalad) {
				isSalad = true;
				return (
					<>
						<ImageSlideshow images={saladImages} />
						<div className="menu-title">
							<h1> Salads </h1>
						</div>
					</>
				);
			} else if (mItem.tag === "burger" && !isBurger) {
				isBurger = true;
				return (
					<>
						<ImageSlideshow images={burgerImages} />
						<div className="menu-title">
							<h1> Burgers </h1>
							<br />
							<br />
						</div>
						<p>
							All of our burgers are made with 1/3 lb. specialty ground beef and
							are served with our specialty blended house sauce, lettuce,
							tomatoes, onions & pickles. Served with a side of French Fries.
						</p>
					</>
				);
			} else if (mItem.tag === "cold sandwich" && !isColdSandwich) {
				isColdSandwich = true;
				return (
					<>
						<ImageSlideshow images={coldImages} />
						<div className="menu-title">
							<h1> Cold Sandwiche's </h1>
						</div>
						<p>
							Choice of bread and cheese. Sandwiches come with mayonnaise,
							mustard, lettuce, tomatoes, onions pickles & pepperoncini.
						</p>
					</>
				);
			} else if (mItem.tag === "grilled sandwich" && !isGrilledSandwich) {
				isGrilledSandwich = true;
				return (
					<>
						<ImageSlideshow images={grilledImages} />
						<div className="menu-title">
							<h1> Grilled Sandwiche's </h1>
						</div>
							<p>
								Comes with side of fries. Sandwiches come with mayonnaise,
								mustard, lettuce, tomatoes, onions pickles & pepperoncini.
								Choice of bread and cheese.
							</p>
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
						<label>
							<input
								type="checkbox"
								checked={saladChecked}
								onChange={handleSaladChecked}
							/>
							Salads
						</label>
						<label>
							<input
								type="checkbox"
								checked={burgerChecked}
								onChange={handleBurgerChecked}
							/>
							Burgers
						</label>
						<label>
							<input
								type="checkbox"
								checked={coldChecked}
								onChange={handleColdChecked}
							/>
							Cold Sandwiche's
						</label>
						<label>
							<input
								type="checkbox"
								checked={grilledChecked}
								onChange={handleGrilledChecked}
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
