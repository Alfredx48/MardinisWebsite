import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faLeaf, faMagnifyingGlass, faPepperHot, faPlus, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { useCart } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { NameInputs } from "../components/ItemNames";
import { DishImage, EmptyState, Modal, QuantityStepper, Spinner } from "../components/ui";
import { money, priceLabel, telHref } from "../format";
import { nameCounts, padNames } from "../itemNames";
import { picksLabel, picksProblem, picksToApi, picksTotal, ruleLabel } from "../modifiers";

// Where the sticky header + category bar end once they're stuck to the top.
function stickyBottom() {
	const toolbar = document.querySelector(".menu-toolbar");
	if (!toolbar) return 0;
	return parseFloat(getComputedStyle(toolbar).top) + toolbar.offsetHeight;
}

// Scrolls so the category starts just below the sticky bars. Measured rather than
// left to scroll-margin, since the bars' height changes with the screen width.
function scrollToCategory(id, behavior = "auto") {
	const section = document.getElementById(`category-${id}`);
	if (!section) return;
	const top = section.getBoundingClientRect().top + window.scrollY - stickyBottom() - 12;
	window.scrollTo({ top: Math.max(0, top), behavior });
}

export default function MenuPage() {
	const { menu, restaurant, error } = useRestaurant();
	const { count, subtotal, openDrawer } = useCart();
	const [search, setSearch] = useState("");
	const [vegOnly, setVegOnly] = useState(false);
	const [activeId, setActiveId] = useState(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const location = useLocation();
	const navRef = useRef(null);
	// While the page glides to a tapped category, the scroll spy stays quiet so the
	// categories passing by don't take over the highlight.
	const jumpingUntil = useRef(0);

	const allItems = useMemo(() => (menu || []).flatMap((c) => c.items), [menu]);
	const selected = allItems.find((i) => String(i.id) === searchParams.get("item"));

	const openItem = (item) => setSearchParams({ item: item.id }, { replace: true });
	const closeItem = () => setSearchParams({}, { replace: true });

	const categories = useMemo(() => {
		const q = search.trim().toLowerCase();
		return (menu || [])
			.map((c) => ({
				...c,
				items: c.items.filter(
					(i) =>
						(!vegOnly || i.vegetarian) &&
						(!q || i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q))
				),
			}))
			.filter((c) => c.items.length);
	}, [menu, search, vegOnly]);

	// Jump to a category when arriving from /menu#category-3
	useEffect(() => {
		if (!menu || !location.hash) return;
		scrollToCategory(location.hash.replace("#category-", ""));
	}, [menu, location.hash]);

	// Highlight the category currently on screen.
	useEffect(() => {
		const sections = [...document.querySelectorAll(".menu-section")];
		if (!sections.length) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (Date.now() < jumpingUntil.current) return;
				const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) setActiveId(visible[0].target.dataset.id);
			},
			{ rootMargin: `-${Math.round(stickyBottom()) + 16}px 0px -55% 0px` }
		);
		sections.forEach((s) => observer.observe(s));
		return () => observer.disconnect();
	}, [categories]);

	// Keep the active chip centered in the horizontally scrolling nav. This scrolls
	// only the nav: scrollIntoView would also scroll the page, which cancels a
	// smooth scroll to a category halfway (landing on the wrong one).
	useEffect(() => {
		const nav = navRef.current;
		const chip = nav?.querySelector(`[data-id="${activeId}"]`);
		if (!chip) return;
		const offset = chip.getBoundingClientRect().left - nav.getBoundingClientRect().left;
		nav.scrollTo({ left: nav.scrollLeft + offset - (nav.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
	}, [activeId]);

	const jumpTo = (id) => {
		setActiveId(String(id));
		jumpingUntil.current = Date.now() + 1500;
		window.addEventListener("scrollend", () => (jumpingUntil.current = 0), { once: true });
		scrollToCategory(id, "smooth");
	};

	if (error && !menu) {
		return (
			<div className="container page">
				<EmptyState icon={faUtensils} title="We couldn't load the menu">
					<p>Please refresh the page, or call us at {restaurant?.phone || "(650) 324-4316"} to order.</p>
				</EmptyState>
			</div>
		);
	}
	if (!menu) return <Spinner label="Loading menu" />;

	return (
		<div className="menu-page">
			<div className="menu-hero">
				<div className="container">
					<span className="eyebrow">Order for pickup</span>
					<h1>Our menu</h1>
					{restaurant && <OrderingStatus restaurant={restaurant} />}
				</div>
			</div>

			<div className="menu-toolbar">
				<div className="container menu-toolbar-inner">
					<nav className="category-nav" ref={navRef} aria-label="Menu categories">
						{categories.map((c) => (
							<a
								key={c.id}
								href={`#category-${c.id}`}
								data-id={c.id}
								className={`chip${String(c.id) === String(activeId) ? " is-active" : ""}`}
								onClick={(e) => {
									e.preventDefault();
									jumpTo(c.id);
								}}
							>
								{c.name}
							</a>
						))}
					</nav>
					<div className="menu-filters">
						<label className="search-box">
							<FontAwesomeIcon icon={faMagnifyingGlass} />
							<span className="sr-only">Search the menu</span>
							<input
								type="search"
								placeholder="Search dishes"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</label>
						<button
							className={`chip chip-toggle${vegOnly ? " is-active" : ""}`}
							aria-pressed={vegOnly}
							onClick={() => setVegOnly((v) => !v)}
						>
							<FontAwesomeIcon icon={faLeaf} /> Vegetarian
						</button>
					</div>
				</div>
			</div>

			<div className="container menu-body">
				{categories.length === 0 && (
					<EmptyState icon={faMagnifyingGlass} title="No dishes match">
						<button
							className="btn btn-secondary"
							onClick={() => {
								setSearch("");
								setVegOnly(false);
							}}
						>
							Clear filters
						</button>
					</EmptyState>
				)}
				{categories.map((c) => (
					<section key={c.id} id={`category-${c.id}`} data-id={c.id} className="menu-section">
						<div className="menu-section-head">
							<h2>{c.name}</h2>
							{c.description && <p className="muted">{c.description}</p>}
						</div>
						<div className="dish-grid">
							{c.items.map((item) => (
								<DishCard key={item.id} item={item} onOpen={() => openItem(item)} />
							))}
						</div>
					</section>
				))}
			</div>

			{count > 0 && (
				<button className="floating-cart" onClick={openDrawer}>
					<span className="floating-cart-count">{count}</span>
					<span>View order</span>
					<span className="money">{money(subtotal)}</span>
				</button>
			)}

			{selected && <ItemDialog item={selected} onClose={closeItem} />}
		</div>
	);
}

function OrderingStatus({ restaurant }) {
	if (!restaurant.accepting_orders) {
		return (
			<p className="menu-status is-paused">
				Online ordering is paused right now. Call <a href={telHref(restaurant.phone)}>{restaurant.phone}</a> to order.
			</p>
		);
	}
	if (!restaurant.accepting_asap) {
		return <p className="menu-status">We're closed right now, but you can schedule a pickup for later.</p>;
	}
	return <p className="menu-status is-open">Ready in about {restaurant.prep_time_minutes} minutes · {(restaurant.address || "").split(",")[0]}</p>;
}

function DietBadges({ item }) {
	return (
		<>
			{item.vegetarian && (
				<span className="badge badge-olive" title="Vegetarian">
					<FontAwesomeIcon icon={faLeaf} /> Veg
				</span>
			)}
			{item.spicy && (
				<span className="badge badge-terracotta" title="Spicy">
					<FontAwesomeIcon icon={faPepperHot} /> Spicy
				</span>
			)}
		</>
	);
}

function DishCard({ item, onOpen }) {
	const { addItem } = useCart();
	const soldOut = !item.available;

	const quickAdd = (e) => {
		e.stopPropagation();
		// Items with sizes or options open the dialog, so customers see their choices.
		if (item.sizes?.length || item.modifier_groups?.length) return onOpen();
		addItem(item, 1);
		toast.success(`Added ${item.name}`);
	};

	return (
		<article
			className={`dish-card${soldOut ? " is-sold-out" : ""}${item.image ? "" : " no-image"}`}
			onClick={soldOut ? undefined : onOpen}
		>
			<div className="dish-card-body">
				<h3>
					<button className="dish-card-title" onClick={onOpen} disabled={soldOut}>
						{item.name}
					</button>
				</h3>
				{item.description && <p className="dish-card-desc">{item.description.replace(/^Vegetarian\.\s*/, "")}</p>}
				<div className="dish-card-meta">
					<span className="money dish-price">{priceLabel(item)}</span>
					<DietBadges item={item} />
					{soldOut && <span className="badge">Sold out</span>}
				</div>
			</div>
			{item.image && <DishImage src={item.image} name={item.name} className="dish-card-img" />}
			{!soldOut && (
				<button className="dish-quick-add" onClick={quickAdd} aria-label={`Add ${item.name} to order`}>
					<FontAwesomeIcon icon={faPlus} />
				</button>
			)}
		</article>
	);
}

function ItemDialog({ item, onClose }) {
	const { addItem, openDrawer } = useCart();
	const [quantity, setQuantity] = useState(1);
	const [request, setRequest] = useState("");
	const [names, setNames] = useState([]); // one per item, for group orders
	const [showNames, setShowNames] = useState(false);
	const sizes = item.sizes || [];
	const [sizeName, setSizeName] = useState(sizes[0]?.name || null);
	const size = sizes.find((s) => s.name === sizeName);
	const [picks, setPicks] = useState({});
	const problem = picksProblem(item, picks);
	const unitPrice = Number(size?.price ?? item.price) + picksTotal(item, picks);
	const soldOut = !item.available;

	const add = () => {
		if (problem) return;
		const labels = showNames ? padNames(names, quantity) : [];
		const named = nameCounts(labels, quantity).named.map((n) => n.name);
		addItem(item, quantity, request, size?.name || null, picksToApi(item, picks), labels);
		onClose();
		toast.success(
			<span>
				Added {quantity > 1 ? `${quantity} × ` : ""}
				{item.name}
				{size ? ` (${size.name})` : ""}
				{picksLabel(item, picks) ? ` with ${picksLabel(item, picks)}` : ""}
				{named.length ? ` for ${named.join(", ")}` : ""}.{" "}
				<button className="link-btn" onClick={openDrawer}>
					View order
				</button>
			</span>
		);
	};

	return (
		<Modal onClose={onClose} label={item.name} className="item-modal">
			{item.image && <DishImage src={item.image} name={item.name} className="item-modal-img" />}
			<div className="modal-body">
				<h2 className="item-modal-title">{item.name}</h2>
				<div className="row">
					<span className="money dish-price">{money(unitPrice)}</span>
					<DietBadges item={item} />
				</div>
				{item.description && <p className="muted item-modal-desc">{item.description}</p>}
				{!soldOut && sizes.length > 0 && (
					<fieldset className="item-sizes">
						<legend className="label">Size</legend>
						<div className="segmented">
							{sizes.map((s) => (
								<button type="button" key={s.name} aria-pressed={s.name === sizeName} onClick={() => setSizeName(s.name)}>
									{s.name}
									<span className="choice-sub">{money(s.price)}</span>
								</button>
							))}
						</div>
					</fieldset>
				)}
				{!soldOut &&
					(item.modifier_groups || []).map((group) => (
						<OptionGroup
							key={group.id}
							group={group}
							chosen={picks[group.id] || []}
							onChange={(names) => setPicks((p) => ({ ...p, [group.id]: names }))}
						/>
					))}
				{soldOut ? (
					<div className="notice">This dish is sold out for now. Check back soon!</div>
				) : (
					<>
						{showNames ? (
							<fieldset className="field item-label-field">
								<legend className="label">{quantity > 1 ? `Names (one for each of the ${quantity})` : "Name for this item"}</legend>
								<NameInputs autoFocus count={quantity} names={names} onChange={setNames} />
								<span className="hint">
									{quantity > 1 ? "We'll write each name on its item. Leave any blank." : "We'll write this name on it."}
								</span>
							</fieldset>
						) : (
							<button type="button" className="link-btn item-label-toggle" onClick={() => setShowNames(true)}>
								+ Add {quantity > 1 ? "names" : "a name"} to {quantity > 1 ? "these items" : "this item"} (group orders)
							</button>
						)}
						<div className="field">
							<label htmlFor="special-request">Special instructions</label>
							<textarea
								id="special-request"
								className="textarea"
								maxLength={200}
								placeholder="No onions, no pickles…"
								value={request}
								onChange={(e) => setRequest(e.target.value)}
							/>
							<span className="hint">We'll do our best. Additions may not always be possible.</span>
						</div>
					</>
				)}
			</div>
			<div className="modal-footer">
				{soldOut ? (
					<button className="btn btn-secondary btn-block" onClick={onClose}>
						Back to menu
					</button>
				) : (
					<>
						<QuantityStepper value={quantity} onChange={setQuantity} />
						<button className="btn btn-primary btn-lg spacer" onClick={add} disabled={Boolean(problem)}>
							{problem ? (
								problem
							) : (
								<>
									<FontAwesomeIcon icon={faBagShopping} /> Add · {money(unitPrice * quantity)}
								</>
							)}
						</button>
					</>
				)}
			</div>
		</Modal>
	);
}

// One option group: single-choice groups swap the choice; others toggle, up
// to the group's limit. Tapping a chosen single option clears it if optional.
function OptionGroup({ group, chosen, onChange }) {
	const single = group.max === 1;
	const full = Boolean(group.max) && chosen.length >= group.max;
	const toggle = (name) => {
		if (chosen.includes(name)) {
			if (single && group.min > 0) return;
			onChange(chosen.filter((n) => n !== name));
		} else {
			onChange(single ? [name] : [...chosen, name]);
		}
	};
	return (
		<fieldset className="item-options">
			<legend>
				<span className="label">{group.name}</span>
				<span className={`option-rule${group.min > 0 ? " is-required" : ""}`}>{ruleLabel(group)}</span>
			</legend>
			<div className="option-list">
				{group.options.map((o) => {
					const on = chosen.includes(o.name);
					return (
						<label key={o.name} className={`option-chip${on ? " is-on" : ""}`}>
							<input
								type="checkbox"
								checked={on}
								disabled={!on && full && !single}
								onChange={() => toggle(o.name)}
							/>
							<span className="option-text">
								{o.name}
								{Number(o.price) > 0 && <span className="option-price">+{money(o.price)}</span>}
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
